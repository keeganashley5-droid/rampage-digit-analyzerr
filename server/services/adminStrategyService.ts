import { database } from './database.js';

const SETTING_KEY = 'platform_strategy_config';

const STRATEGY_IDS = [
  'matches',
  'over5',
  'under5',
  'dual_bar_over3',
  'triple_tap_over3',
  'under6',
  'under7',
  'digit_frequency_switch',
] as const;

const ALLOWED_FIELDS = new Set([
  'name',
  'description',
  'defaultBarrier',
  'maxRunsPerCycle',
  'martingaleEnabled',
  'consecutiveRequired',
  'matchesTargetMode',
  'matchesCustomDigit',
  'isEnabled',
]);

export interface PlatformStrategyOverride {
  name?: string;
  description?: string;
  defaultBarrier?: number;
  maxRunsPerCycle?: number;
  martingaleEnabled?: boolean;
  consecutiveRequired?: number;
  matchesTargetMode?: 'second_most_frequent' | 'most_frequent' | 'custom_digit';
  matchesCustomDigit?: number;
  isEnabled?: boolean;
}

export interface PlatformStrategyConfig {
  overrides: Record<string, PlatformStrategyOverride>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateConfig(value: unknown): PlatformStrategyConfig {
  if (!isRecord(value) || !isRecord(value.overrides)) {
    throw new Error('Invalid strategy configuration.');
  }

  const overrides: Record<string, PlatformStrategyOverride> = {};

  for (const [id, raw] of Object.entries(value.overrides)) {
    if (!STRATEGY_IDS.includes(id as typeof STRATEGY_IDS[number])) {
      throw new Error(`Unknown strategy: ${id}`);
    }

    if (!isRecord(raw)) {
      throw new Error(`Invalid settings for ${id}.`);
    }

    const clean: Record<string, unknown> = {};

    for (const [field, item] of Object.entries(raw)) {
      if (!ALLOWED_FIELDS.has(field)) {
        throw new Error(`Unsupported strategy setting: ${field}`);
      }

      if (field === 'name') {
        if (typeof item !== 'string' || item.trim().length < 1 || item.length > 60) {
          throw new Error(`Invalid strategy name for ${id}.`);
        }
        clean[field] = item.trim();
      } else if (field === 'description') {
        if (typeof item !== 'string' || item.length > 500) {
          throw new Error(`Invalid strategy description for ${id}.`);
        }
        clean[field] = item.trim();
      } else if (field === 'defaultBarrier') {
        if (!Number.isInteger(item) || (item as number) < 0 || (item as number) > 9) {
          throw new Error(`Invalid barrier for ${id}.`);
        }
        clean[field] = item;
      } else if (field === 'maxRunsPerCycle') {
        if (!Number.isInteger(item) || (item as number) < 1 || (item as number) > 1000) {
          throw new Error(`Invalid cycle limit for ${id}.`);
        }
        clean[field] = item;
      } else if (field === 'consecutiveRequired') {
        if (!Number.isInteger(item) || (item as number) < 1 || (item as number) > 100) {
          throw new Error(`Invalid consecutive count for ${id}.`);
        }
        clean[field] = item;
      } else if (field === 'matchesCustomDigit') {
        if (!Number.isInteger(item) || (item as number) < 0 || (item as number) > 9) {
          throw new Error(`Invalid custom digit for ${id}.`);
        }
        clean[field] = item;
      } else if (field === 'martingaleEnabled' || field === 'isEnabled') {
        if (typeof item !== 'boolean') {
          throw new Error(`Invalid toggle for ${id}.`);
        }
        clean[field] = item;
      } else if (field === 'matchesTargetMode') {
        if (
          item !== 'second_most_frequent' &&
          item !== 'most_frequent' &&
          item !== 'custom_digit'
        ) {
          throw new Error(`Invalid Matches target mode.`);
        }
        clean[field] = item;
      }
    }

    overrides[id] = clean as PlatformStrategyOverride;
  }

  return { overrides };
}

export async function getPlatformStrategyConfig(): Promise<PlatformStrategyConfig> {
  const result = await database.query<{ setting_value: unknown }>(
    'SELECT setting_value FROM admin_settings WHERE setting_key = $1 LIMIT 1',
    [SETTING_KEY],
  );

  if (result.rowCount !== 1) {
    return { overrides: {} };
  }

  return validateConfig(result.rows[0].setting_value);
}

export async function savePlatformStrategyConfig(
  adminUserId: string,
  value: unknown,
): Promise<PlatformStrategyConfig> {
  const config = validateConfig(value);
  const client = await database.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO admin_settings (setting_key, setting_value, updated_by, updated_at)
       VALUES ($1, $2::jsonb, $3, NOW())
       ON CONFLICT (setting_key)
       DO UPDATE SET
         setting_value = EXCLUDED.setting_value,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()`,
      [SETTING_KEY, JSON.stringify(config), adminUserId],
    );

    await client.query(
      `INSERT INTO admin_audit_log (admin_user_id, action, target, details)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [
        adminUserId,
        'platform_strategy_config_updated',
        SETTING_KEY,
        JSON.stringify({ strategyIds: Object.keys(config.overrides) }),
      ],
    );

    await client.query('COMMIT');
    return config;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
