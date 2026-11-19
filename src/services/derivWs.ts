import { ContractTrade, ContractType, MarketTick, UserAccount } from '../types/deriv';
import { extractLastDigit } from '../engine/digits';
import { getDerivOtp } from './derivOAuth';
import type { DerivOAuthAccount } from './derivOAuth';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'authorized' | 'error';

export interface TickListener {
  (tick: MarketTick): void;
}

export interface HistoryListener {
  (ticks: MarketTick[]): void;
}

export interface SettlementListener {
  (trade: ContractTrade): void;
}

export interface BalanceListener {
  (balance: number, currency: string): void;
}

export class DerivWebSocketClient {
  // Public market-data connection (ticks and history only).
  private ws: WebSocket | null = null;

  // Independent authenticated trading connection.
  private tradingWs: WebSocket | null = null;
  private tradingPendingRequests = new Map<number, {
    resolve: (val: any) => void;
    reject: (err: any) => void;
  }>();
  private proposalBindings = new Map<string, {
    socket: WebSocket;
    account: UserAccount;
    accountId: string;
    loginid: string;
    isVirtual: boolean;
    createdAt: number;
  }>();
  private tradingReqIdCounter = 1;
  private tradingKeepAliveTimer: number | null = null;
  private tradingConnectionKind: 'oauth' | 'manual' | null = null;
  private appId: string = '34WX6vZw9IUehtmv3KZ1B';
  private currentSymbol: string = '';
  private currentSubscriptionId: string | null = null;
  private isConnecting: boolean = false;
  private reconnectTimer: number | null = null;
  private keepAliveTimer: number | null = null;
  private pendingRequests = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();
  private reqIdCounter = 1;
  private activeContractSubscriptions = new Map<string | number, string>(); // contractId -> subscriptionId

  // Listeners
  private tickListeners: Set<TickListener> = new Set();
  private historyListeners: Set<HistoryListener> = new Set();
  private settlementListeners: Set<SettlementListener> = new Set();
  private balanceListeners: Set<BalanceListener> = new Set();
  private statusListeners: Set<(status: ConnectionStatus, message?: string) => void> = new Set();

  public status: ConnectionStatus = 'disconnected';
  public userAccount: UserAccount | null = null;

  constructor(appId: string = '34WX6vZw9IUehtmv3KZ1B') {
    this.appId = appId;
  }

  public setAppId(appId: string) {
    this.appId = appId;
  }

  public onTick(cb: TickListener): () => void {
    this.tickListeners.add(cb);
    return () => this.tickListeners.delete(cb);
  }

  public onHistory(cb: HistoryListener): () => void {
    this.historyListeners.add(cb);
    return () => this.historyListeners.delete(cb);
  }

  public onSettlement(cb: SettlementListener): () => void {
    this.settlementListeners.add(cb);
    return () => this.settlementListeners.delete(cb);
  }

  public onBalance(cb: BalanceListener): () => void {
    this.balanceListeners.add(cb);
    return () => this.balanceListeners.delete(cb);
  }

  public onStatus(cb: (status: ConnectionStatus, msg?: string) => void): () => void {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => this.statusListeners.delete(cb);
  }

  private setStatus(status: ConnectionStatus, message?: string) {
    this.status = status;
    this.statusListeners.forEach((cb) => cb(status, message));
  }

  /**
   * Connect to Deriv WebSocket API
   */
  /**
   * Connect to the public Deriv market-data WebSocket.
   * Account authentication is handled by the separate trading socket.
   */
  public connect(): Promise<boolean> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve(true);
    }

    if (this.ws?.readyState === WebSocket.CONNECTING) {
      return Promise.resolve(false);
    }

    this.isConnecting = true;
    if (this.tradingWs?.readyState !== WebSocket.OPEN) {
      this.setStatus('connecting');
    }

    return new Promise((resolve) => {
      let settled = false;
      let timeout: number;

      const finish = (result: boolean) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        resolve(result);
      };

      try {
        const url = `wss://api.derivws.com/trading/v1/options/ws/public`;
        const socket = new WebSocket(url);
        this.ws = socket;

        timeout = window.setTimeout(() => {
          if (socket.readyState !== WebSocket.OPEN) {
            this.isConnecting = false;
            if (this.tradingWs?.readyState !== WebSocket.OPEN) {
              this.setStatus('error', 'Deriv connection timed out');
            }
            socket.close();
            finish(false);
          }
        }, 10000);

        socket.onopen = () => {
          this.isConnecting = false;

          if (this.tradingWs?.readyState === WebSocket.OPEN) {
            this.setStatus('authorized');
          } else {
            this.setStatus('connected', 'Deriv market-data connection connected');
          }

          this.startKeepAlive();

          if (this.currentSymbol) {
            this.subscribeMarket(this.currentSymbol);
          }

          finish(true);
        };

        socket.onmessage = (event) => {
          try {
            this.handleMessage(JSON.parse(event.data));
          } catch (error) {
            console.error('Failed to process Deriv market-data message', error);
          }
        };

        socket.onerror = () => {
          this.isConnecting = false;

          if (this.tradingWs?.readyState !== WebSocket.OPEN) {
            this.setStatus('error', 'Unable to connect to Deriv. Check your connection.');
          }

          finish(false);
        };

        socket.onclose = () => {
          this.isConnecting = false;
          this.stopKeepAlive();

          for (const request of this.pendingRequests.values()) {
            request.reject(new Error('Deriv market-data connection closed'));
          }
          this.pendingRequests.clear();

          if (this.tradingWs?.readyState === WebSocket.OPEN) {
            this.setStatus('authorized');
          } else {
            this.setStatus('disconnected', 'Deriv market-data connection closed');
          }

          finish(false);
        };
      } catch (error: any) {
        this.isConnecting = false;

        if (this.tradingWs?.readyState !== WebSocket.OPEN) {
          this.setStatus('error', error?.message || 'Could not connect to Deriv');
        }

        finish(false);
      }
    });
  }
  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (this.status === 'disconnected') {
        this.connect();
      }
    }, 3000);
  }

  private startKeepAlive() {
    this.stopKeepAlive();
    this.keepAliveTimer = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ ping: 1 });
      }
    }, 25000);
  }

  private stopKeepAlive() {
    if (this.keepAliveTimer) {
      window.clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  private send(payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket is not connected'));
        return;
      }

      const reqId = this.reqIdCounter++;
      payload.req_id = reqId;
      this.pendingRequests.set(reqId, { resolve, reject });

      try {
        this.ws.send(JSON.stringify(payload));
      } catch (e) {
        this.pendingRequests.delete(reqId);
        reject(e);
      }
    });
  }

  private handleMessage(data: any) {
    if (!data) return;

    // Check pending request callbacks
    if (data.req_id && this.pendingRequests.has(data.req_id)) {
      const { resolve, reject } = this.pendingRequests.get(data.req_id)!;
      this.pendingRequests.delete(data.req_id);

      if (data.error) {
        reject(new Error(data.error.message || 'Deriv API error'));
      } else {
        resolve(data);
      }
    }

    const msgType = data.msg_type;

    // Tick message
    if (msgType === 'tick' && data.tick) {
      const t = data.tick;
      const digit = extractLastDigit(t.quote, t.pip_size);
      const marketTick: MarketTick = {
        epoch: t.epoch,
        quote: t.quote,
        digit,
        symbol: t.symbol,
      };

      if (data.subscription?.id) {
        this.currentSubscriptionId = data.subscription.id;
      }

      this.tickListeners.forEach((listener) => listener(marketTick));
    }

    // Tick History message
    if (msgType === 'history' && data.history) {
      const history = data.history;
      const pipSize = data.pip_size;
      const symbol = this.currentSymbol;
      const ticks: MarketTick[] = [];

      if (Array.isArray(history.prices) && Array.isArray(history.times)) {
        for (let i = 0; i < history.prices.length; i++) {
          const quote = Number(history.prices[i]);
          const epoch = Number(history.times[i]);
          const digit = extractLastDigit(quote, pipSize);
          ticks.push({
            epoch,
            quote,
            digit,
            symbol,
          });
        }
      }

      this.historyListeners.forEach((listener) => listener(ticks));
    }

    // Balance update
    if (msgType === 'balance' && data.balance) {
      const b = data.balance;
      if (this.userAccount) {
        this.userAccount.balance = b.balance;
        this.userAccount.currency = b.currency;
      }
      this.balanceListeners.forEach((cb) => cb(b.balance, b.currency));
    }

    // Open Contract updates & Settlement
    if (msgType === 'proposal_open_contract' && data.proposal_open_contract) {
      this.handleOpenContractUpdate(data.proposal_open_contract);
    }
  }

  /**
   * Send a request through the authenticated trading socket.
   * This connection is independent of the public market-data socket.
   */
  private sendTrading(payload: any, expectedSocket?: WebSocket): Promise<any> {
    return new Promise((resolve, reject) => {
      const socket = expectedSocket ?? this.tradingWs;
      if (!socket || socket !== this.tradingWs || socket.readyState !== WebSocket.OPEN) {
        reject(new Error('Authenticated trading connection changed or is not open'));
        return;
      }

      const reqId = this.tradingReqIdCounter++;
      const request = { ...payload, req_id: reqId };

      this.tradingPendingRequests.set(reqId, { resolve, reject });

      try {
        socket.send(JSON.stringify(request));
      } catch (error) {
        this.tradingPendingRequests.delete(reqId);
        reject(error);
      }
    });
  }

  /**
   * Process responses and account updates from the trading socket only.
   */
  private handleTradingMessage(data: any) {
    if (!data) return;

    if (data.req_id && this.tradingPendingRequests.has(data.req_id)) {
      const pending = this.tradingPendingRequests.get(data.req_id)!;
      this.tradingPendingRequests.delete(data.req_id);

      if (data.error) {
        pending.reject(new Error(data.error.message || 'Deriv trading API error'));
      } else {
        pending.resolve(data);
      }
    }

    if (data.msg_type === 'balance' && data.balance) {
      const balance = data.balance;

      if (this.userAccount) {
        this.userAccount.balance = Number(balance.balance);
        this.userAccount.currency = balance.currency;
      }

      this.balanceListeners.forEach((listener) =>
        listener(Number(balance.balance), balance.currency)
      );
    }

    if (
      data.msg_type === 'proposal_open_contract' &&
      data.proposal_open_contract
    ) {
      this.handleOpenContractUpdate(data.proposal_open_contract);
    }
  }

  private handleOpenContractUpdate(poc: any) {
    const outcome = poc.status === 'won' || poc.status === 'lost' ? poc.status : null;
    const profit = Number(poc.profit);

    if (poc.contract_id === undefined || poc.contract_id === null || !outcome || !Number.isFinite(profit)) {
      return;
    }

    const trade: ContractTrade = {
      id: `trade_${poc.contract_id}`,
      contractId: poc.contract_id,
      symbol: poc.underlying,
      symbolName: poc.underlying,
      strategyId: 'matches',
      strategyName: 'Strategy',
      contractType: poc.contract_type as any,
      barrier: poc.barrier ? Number(poc.barrier) : 0,
      stake: poc.buy_price ? Number(poc.buy_price) : 0,
      payout: poc.payout ? Number(poc.payout) : 0,
      entryTickQuote: poc.entry_tick ? Number(poc.entry_tick) : 0,
      entryDigit: extractLastDigit(poc.entry_tick),
      exitTickQuote: poc.exit_tick ? Number(poc.exit_tick) : 0,
      exitDigit: extractLastDigit(poc.exit_tick),
      status: outcome,
      profit,
      startTime: poc.date_start ? poc.date_start * 1000 : Date.now(),
      settleTime: poc.date_expiry ? poc.date_expiry * 1000 : Date.now(),
      isAutomated: false,
      accountType: this.userAccount?.isVirtual ? 'demo' : 'real',
      cycleIndex: 1,
    };

    this.settlementListeners.forEach((listener) => listener(trade));

    if (poc.id) {
      this.sendTrading({ forget: poc.id }).catch(() => {});
    }
  }
  /**
   * Request tick history and subscribe to live ticks
   */
  public async subscribeMarket(symbol: string, tickCount: number = 1000): Promise<void> {
    this.currentSymbol = symbol;


    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    try {
      // Forget previous tick subscriptions
      await this.send({ forget_all: 'ticks' }).catch(() => {});

      // 1. Request tick history
      await this.send({
        ticks_history: symbol,
        adjust_start_time: 1,
        count: tickCount,
        end: 'latest',
        style: 'ticks',
      });

      // 2. Subscribe to continuous live ticks
      await this.send({
        ticks: symbol,
        subscribe: 1,
      });
    } catch (err) {
      console.error('Failed to subscribe to market', symbol, err);
    }
  }

  /**
   * Maintain the authenticated trading socket independently of market data.
   */
  private startTradingKeepAlive() {
    this.stopTradingKeepAlive();

    this.tradingKeepAliveTimer = window.setInterval(() => {
      if (this.tradingWs?.readyState === WebSocket.OPEN) {
        this.sendTrading({ ping: 1 }).catch(() => {});
      }
    }, 25000);
  }

  private stopTradingKeepAlive() {
    if (this.tradingKeepAliveTimer !== null) {
      window.clearInterval(this.tradingKeepAliveTimer);
      this.tradingKeepAliveTimer = null;
    }
  }

  private async connectTradingSocket(
    url: string,
    kind: 'oauth' | 'manual' = 'oauth',
    manualToken?: string
  ): Promise<any> {
    this.proposalBindings.clear();
    if (this.tradingWs) {
      const previous = this.tradingWs;
      this.tradingWs = null;
      previous.close();
    }

    this.stopTradingKeepAlive();

    for (const request of this.tradingPendingRequests.values()) {
      request.reject(new Error('Trading connection replaced'));
    }
    this.tradingPendingRequests.clear();

    this.tradingConnectionKind = kind;
    this.setStatus('connecting', 'Connecting authenticated trading account');

    return new Promise((resolve, reject) => {
      let settled = false;
      let timeout: number;

      const finish = (error?: Error, result?: any) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);

        if (error) reject(error);
        else resolve(result);
      };

      let socket: WebSocket;

      try {
        socket = new WebSocket(url);
        this.tradingWs = socket;

        timeout = window.setTimeout(() => {
          if (socket.readyState !== WebSocket.OPEN) {
            finish(new Error('Trading connection timed out'));
            socket.close();
          }
        }, 15000);

        socket.onopen = async () => {
          this.startTradingKeepAlive();

          if (kind === 'manual') {
            try {
              if (!manualToken) {
                throw new Error('A valid Deriv API token is required');
              }

              const response = await this.sendTrading({
                authorize: manualToken
              });

              if (!response.authorize) {
                throw new Error('Manual authorization failed');
              }

              finish(undefined, response);
            } catch (error: any) {
              finish(
                error instanceof Error
                  ? error
                  : new Error('Authorization failed')
              );
              socket.close();
            }
          } else {
            finish(undefined, {});
          }
        };

        socket.onmessage = (event) => {
          try {
            this.handleTradingMessage(JSON.parse(event.data));
          } catch (error) {
            console.error('Failed to process authenticated trading message', error);
          }
        };

        socket.onerror = () => {
          finish(new Error('Unable to establish the authenticated trading connection'));
        };

        socket.onclose = () => {
          this.stopTradingKeepAlive();

          for (const request of this.tradingPendingRequests.values()) {
            request.reject(new Error('Authenticated trading connection closed'));
          }
          this.tradingPendingRequests.clear();

          if (this.tradingWs === socket) {
            this.tradingWs = null;

            if (this.userAccount) {
              this.userAccount = null;
            }

            this.setStatus(
              this.ws?.readyState === WebSocket.OPEN ? 'connected' : 'disconnected',
              'Authenticated trading connection closed'
            );
          }

          finish(new Error('Authenticated trading connection closed'));
        };
      } catch (error: any) {
        finish(error instanceof Error ? error : new Error('Could not open trading connection'));
      }
    });
  }

  /**
   * Authorize using a legacy Deriv API token on its own trading socket.
   */
  public async authorize(token: string): Promise<UserAccount> {
    if (!token || !token.trim()) {
      throw new Error('A valid Deriv API token is required');
    }

    const url = `wss://ws.derivws.com/websockets/v3?app_id=${this.appId}&l=EN`;
    const response = await this.connectTradingSocket(url, 'manual', token);
    const auth = response.authorize;

    const account: UserAccount = {
      token,
      authType: 'manual',
      loginid: auth.loginid,
      isVirtual: Boolean(auth.is_virtual),
      currency: auth.currency,
      balance: Number(auth.balance),
      email: auth.email,
      fullname: auth.fullname,
      realTradingAuthorized: false,
    };

    this.userAccount = account;
    this.setStatus('authorized');

    await this.sendTrading({ balance: 1, subscribe: 1 }).then((response) => {
      if (!response?.balance) {
        throw new Error('Deriv did not return an initial account balance');
      }
    }).catch((error) => {
      console.error('Deriv balance subscription failed:', error);
    });

    return account;
  }

  /**
   * Authorize an OAuth account using a short-lived, backend-issued OTP URL.
   * The OAuth access token never enters the browser.
   */
  public async authorizeOAuth(account: DerivOAuthAccount): Promise<UserAccount> {
    if (!account?.account_id) {
      throw new Error('A valid Deriv account selection is required');
    }

    const otp = await getDerivOtp(account.account_id);

    if (!otp?.url || !/^wss:\/\/api\.derivws\.com\/trading\/v1\/options\/ws\/(demo|real)\?/.test(otp.url)) {
      throw new Error('Deriv returned an invalid authenticated WebSocket URL');
    }

    const expectedType = account.account_type === 'real' ? 'real' : 'demo';
    if (otp.accountType !== expectedType) {
      throw new Error('The authenticated account type does not match your selection');
    }

    await this.connectTradingSocket(otp.url);

    const user: UserAccount = {
      authType: 'oauth',
      accountId: account.account_id,
      loginid: account.account_id,
      isVirtual: expectedType === 'demo',
      currency: account.currency,
      balance: Number(account.balance ?? 0),
      realTradingAuthorized: false,
    };

    this.userAccount = user;
    this.setStatus('authorized');

    await this.sendTrading({ balance: 1, subscribe: 1 }).then((response) => {
      if (!response?.balance) {
        throw new Error('Deriv did not return an initial account balance');
      }
    }).catch((error) => {
      console.error('Deriv balance subscription failed:', error);
    });

    return user;
  }
  /**
   * Request a proposal for a digit contract with a configurable duration.
   * Existing callers retain the original 1-tick default.
   */
  public async requestProposal(params: {
    symbol: string;
    contractType: ContractType;
    barrier?: number;
    amount: number;
    currency?: string;
    duration?: number;
    durationUnit?: 't' | 's' | 'm' | 'h' | 'd';
  }): Promise<{ proposalId: string; askPrice: number; payout: number; spot: number }> {
    const socket = this.tradingWs;
    const account = this.userAccount;

    if (
      this.status !== 'authorized' ||
      !account ||
      account.authType !== 'oauth' ||
      !account.accountId ||
      !account.loginid ||
      !socket ||
      socket.readyState !== WebSocket.OPEN
    ) {
      throw new Error('An authenticated OAuth Deriv account is required for proposals');
    }

    if (!Number.isFinite(params.amount) || params.amount <= 0) {
      throw new Error('Proposal stake must be greater than zero');
    }

    const duration = params.duration ?? 1;
    const durationUnit = params.durationUnit ?? 't';
    if (!Number.isInteger(duration) || duration < 1) {
      throw new Error('Contract duration must be a positive whole number');
    }
    if (!['t', 's', 'm', 'h', 'd'].includes(durationUnit)) {
      throw new Error('Unsupported contract duration unit');
    }

    const req: any = {
      proposal: 1,
      amount: params.amount,
      basis: 'stake',
      contract_type: params.contractType,
      currency: params.currency || account.currency,
      duration,
      duration_unit: durationUnit,
      underlying_symbol: params.symbol,
      subscribe: 1,
    };

    if (params.barrier !== undefined) {
      req.barrier = params.barrier.toString();
    }

    const res = await this.sendTrading(req, socket);

    if (res.error || !res.proposal) {
      throw new Error(res.error?.message || 'Proposal request rejected');
    }

    if (
      this.status !== 'authorized' ||
      this.tradingWs !== socket ||
      this.userAccount !== account ||
      socket.readyState !== WebSocket.OPEN
    ) {
      throw new Error('Trading account changed while the proposal was being requested');
    }

    const prop = res.proposal;
    const proposalId = String(prop.id ?? '');
    if (!proposalId) {
      throw new Error('Deriv returned an invalid proposal ID');
    }

    const now = Date.now();
    for (const [id, binding] of this.proposalBindings) {
      if (now - binding.createdAt > 30000) this.proposalBindings.delete(id);
    }
    while (this.proposalBindings.size >= 100) {
      const oldestId = this.proposalBindings.keys().next().value;
      if (oldestId === undefined) break;
      this.proposalBindings.delete(oldestId);
    }

    this.proposalBindings.set(proposalId, {
      socket,
      account,
      accountId: account.accountId,
      loginid: account.loginid,
      isVirtual: account.isVirtual,
      createdAt: now,
    });

    return {
      proposalId,
      askPrice: Number(prop.ask_price),
      payout: Number(prop.payout),
      spot: Number(prop.spot),
    };
  }

  /**
   * Purchase an authorized contract and monitor its settlement.
   */
  public async buyContract(proposalId: string, stake: number): Promise<{ contractId: number; buyPrice: number }> {
    if (!proposalId || !Number.isFinite(stake) || stake <= 0) {
      throw new Error('Invalid proposal ID or purchase stake');
    }

    const binding = this.proposalBindings.get(proposalId);
    this.proposalBindings.delete(proposalId);

    if (!binding || Date.now() - binding.createdAt > 30000) {
      throw new Error('Purchase blocked: proposal is missing, expired, or already used');
    }

    if (
      this.status !== 'authorized' ||
      this.tradingWs !== binding.socket ||
      binding.socket.readyState !== WebSocket.OPEN ||
      this.userAccount !== binding.account ||
      this.userAccount.authType !== 'oauth' ||
      this.userAccount.accountId !== binding.accountId ||
      this.userAccount.loginid !== binding.loginid ||
      this.userAccount.isVirtual !== binding.isVirtual
    ) {
      throw new Error('Purchase blocked: the authenticated Deriv account changed after proposal');
    }

    const res = await this.sendTrading({
      buy: proposalId,
      price: stake,
    }, binding.socket);

    if (res.error || !res.buy) {
      throw new Error(res.error?.message || 'Purchase rejected');
    }

    const buy = res.buy;

    this.sendTrading({
      proposal_open_contract: 1,
      contract_id: buy.contract_id,
      subscribe: 1,
    }, binding.socket).catch((error) => {
      console.error('Could not subscribe to contract settlement updates', error);
    });

    return {
      contractId: Number(buy.contract_id),
      buyPrice: Number(buy.buy_price),
    };
  }

  /**
   * Log out / disconnect the authenticated account without stopping market data.
   */
  public disconnectAccount(): void {
    this.proposalBindings.clear();
    this.userAccount = null;
    this.tradingConnectionKind = null;
    this.stopTradingKeepAlive();

    for (const request of this.tradingPendingRequests.values()) {
      request.reject(new Error('Trading account disconnected'));
    }
    this.tradingPendingRequests.clear();

    const socket = this.tradingWs;
    this.tradingWs = null;

    if (socket && socket.readyState !== WebSocket.CLOSED) {
      socket.close();
    }

    this.setStatus(
      this.ws?.readyState === WebSocket.OPEN ? 'connected' : 'disconnected'
    );
  }}

// Global singleton client
export const derivWs = new DerivWebSocketClient();
