import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ExecutionLogStore } from './execution-log.store';
import { RuntimeExecutionRecord } from './execution-log.types';

@Injectable()
export class RuntimeMetricsService {
  constructor(
    private readonly executions: ExecutionLogStore,
    private readonly config: ConfigService,
  ) {}

  async snapshot() {
    const sample = await this.executions.recent(500);
    const windowMinutes = Number(
      this.config.get<string>('METRICS_WINDOW_MINUTES', '60'),
    );
    const cutoff =
      Date.now() - Math.max(1, windowMinutes) * 60 * 1000;
    const windowed = sample.filter(
      (item) => new Date(item.startedAt).getTime() >= cutoff,
    );

    const completed = windowed.filter(
      (item) => item.status === 'completed',
    );
    const failed = windowed.filter((item) => item.status === 'failed');
    const durations = completed
      .map((item) => item.durationMs)
      .filter((value): value is number => typeof value === 'number')
      .sort((a, b) => a - b);

    const successRate =
      completed.length + failed.length === 0
        ? 1
        : completed.length / (completed.length + failed.length);
    const averageDurationMs = durations.length
      ? Math.round(
          durations.reduce((sum, value) => sum + value, 0) /
            durations.length,
        )
      : 0;
    const p95DurationMs = durations.length
      ? durations[
          Math.min(
            durations.length - 1,
            Math.ceil(durations.length * 0.95) - 1,
          )
        ]
      : 0;

    const byAgent = this.group(windowed, 'agentId');
    const byProvider = this.group(windowed, 'providerId');

    const failureRateThreshold = Number(
      this.config.get<string>('ALERT_FAILURE_RATE', '0.2'),
    );
    const p95Threshold = Number(
      this.config.get<string>('ALERT_P95_MS', '60000'),
    );
    const alerts: Array<{
      code: string;
      severity: 'warning' | 'critical';
      message: string;
    }> = [];

    if (
      completed.length + failed.length >= 5 &&
      1 - successRate >= failureRateThreshold
    ) {
      alerts.push({
        code: 'runtime_failure_rate',
        severity: 'critical',
        message:
          `La tasa de fallos de los últimos ${windowMinutes} min es ` +
          `${Math.round((1 - successRate) * 100)}%.`,
      });
    }

    if (p95DurationMs >= p95Threshold && p95DurationMs > 0) {
      alerts.push({
        code: 'runtime_p95_latency',
        severity: 'warning',
        message:
          `El P95 de ejecución es ${p95DurationMs} ms, por encima del umbral ` +
          `de ${p95Threshold} ms.`,
      });
    }

    return {
      generatedAt: new Date().toISOString(),
      windowMinutes,
      total: windowed.length,
      completed: completed.length,
      failed: failed.length,
      successRate,
      averageDurationMs,
      p95DurationMs,
      byAgent,
      byProvider,
      alerts,
    };
  }

  private group(
    items: RuntimeExecutionRecord[],
    key: 'agentId' | 'providerId',
  ) {
    const result: Record<
      string,
      { total: number; completed: number; failed: number }
    > = {};

    for (const item of items) {
      const id = item[key] ?? 'unknown';
      const bucket =
        result[id] ??
        (result[id] = { total: 0, completed: 0, failed: 0 });

      bucket.total += 1;
      if (item.status === 'completed') bucket.completed += 1;
      if (item.status === 'failed') bucket.failed += 1;
    }

    return result;
  }
}
