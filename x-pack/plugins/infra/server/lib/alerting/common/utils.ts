/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isError } from 'lodash';
import { schema } from '@kbn/config-schema';
import { Logger, LogMeta } from '@kbn/logging';
import type { IBasePath } from '@kbn/core/server';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { ObservabilityConfig } from '@kbn/observability-plugin/server';
import { ALERT_RULE_PARAMETERS, TIMESTAMP } from '@kbn/rule-data-utils';
import { parseTechnicalFields } from '@kbn/rule-registry-plugin/common/parse_technical_fields';
import { LINK_TO_METRICS_EXPLORER } from '../../../../common/alerting/metrics';
import { getInventoryViewInAppUrl } from '../../../../common/alerting/metrics/alert_link';
import {
  AlertExecutionDetails,
  InventoryMetricConditions,
} from '../../../../common/alerting/metrics/types';

export const oneOfLiterals = (arrayOfLiterals: Readonly<string[]>) =>
  schema.string({
    validate: (value) =>
      arrayOfLiterals.includes(value) ? undefined : `must be one of ${arrayOfLiterals.join(' | ')}`,
  });

export const validateIsStringElasticsearchJSONFilter = (value: string) => {
  if (value === '') {
    // Allow clearing the filter.
    return;
  }

  const errorMessage = 'filterQuery must be a valid Elasticsearch filter expressed in JSON';
  try {
    const parsedValue = JSON.parse(value);
    if (!isEmpty(parsedValue.bool)) {
      return undefined;
    }
    return errorMessage;
  } catch (e) {
    return errorMessage;
  }
};

export const UNGROUPED_FACTORY_KEY = '*';

export const createScopedLogger = (
  logger: Logger,
  scope: string,
  alertExecutionDetails: AlertExecutionDetails
): Logger => {
  const scopedLogger = logger.get(scope);
  const fmtMsg = (msg: string) =>
    `[AlertId: ${alertExecutionDetails.alertId}][ExecutionId: ${alertExecutionDetails.executionId}] ${msg}`;
  return {
    ...scopedLogger,
    info: <Meta extends LogMeta = LogMeta>(msg: string, meta?: Meta) =>
      scopedLogger.info(fmtMsg(msg), meta),
    debug: <Meta extends LogMeta = LogMeta>(msg: string, meta?: Meta) =>
      scopedLogger.debug(fmtMsg(msg), meta),
    trace: <Meta extends LogMeta = LogMeta>(msg: string, meta?: Meta) =>
      scopedLogger.trace(fmtMsg(msg), meta),
    warn: <Meta extends LogMeta = LogMeta>(errorOrMessage: string | Error, meta?: Meta) => {
      if (isError(errorOrMessage)) {
        scopedLogger.warn(errorOrMessage, meta);
      } else {
        scopedLogger.warn(fmtMsg(errorOrMessage), meta);
      }
    },
    error: <Meta extends LogMeta = LogMeta>(errorOrMessage: string | Error, meta?: Meta) => {
      if (isError(errorOrMessage)) {
        scopedLogger.error(errorOrMessage, meta);
      } else {
        scopedLogger.error(fmtMsg(errorOrMessage), meta);
      }
    },
    fatal: <Meta extends LogMeta = LogMeta>(errorOrMessage: string | Error, meta?: Meta) => {
      if (isError(errorOrMessage)) {
        scopedLogger.fatal(errorOrMessage, meta);
      } else {
        scopedLogger.fatal(fmtMsg(errorOrMessage), meta);
      }
    },
  };
};

export const getAlertDetailsPageEnabledForApp = (
  config: ObservabilityConfig['unsafe']['alertDetails'] | null,
  appName: keyof ObservabilityConfig['unsafe']['alertDetails']
): boolean => {
  if (!config) return false;

  return config[appName].enabled;
};

export const getViewInInventoryAppUrl = ({
  basePath,
  criteria,
  nodeType,
  spaceId,
  timestamp,
}: {
  basePath: IBasePath;
  criteria: InventoryMetricConditions[];
  nodeType: string;
  spaceId: string;
  timestamp: string;
}) => {
  const { metric, customMetric } = criteria[0];

  const fields = {
    [`${ALERT_RULE_PARAMETERS}.criteria.metric`]: [metric],
    [`${ALERT_RULE_PARAMETERS}.criteria.customMetric.id`]: [customMetric?.id],
    [`${ALERT_RULE_PARAMETERS}.criteria.customMetric.aggregation`]: [customMetric?.aggregation],
    [`${ALERT_RULE_PARAMETERS}.criteria.customMetric.field`]: [customMetric?.field],
    [`${ALERT_RULE_PARAMETERS}.nodeType`]: [nodeType],
    [TIMESTAMP]: timestamp,
  };

  return addSpaceIdToPath(
    basePath.publicBaseUrl,
    spaceId,
    getInventoryViewInAppUrl(parseTechnicalFields(fields, true))
  );
};

export const getViewInMetricsAppUrl = (basePath: IBasePath, spaceId: string) =>
  addSpaceIdToPath(basePath.publicBaseUrl, spaceId, LINK_TO_METRICS_EXPLORER);

export const getAlertDetailsUrl = (
  basePath: IBasePath,
  spaceId: string,
  alertUuid: string | null
) => addSpaceIdToPath(basePath.publicBaseUrl, spaceId, `/app/observability/alerts/${alertUuid}`);
