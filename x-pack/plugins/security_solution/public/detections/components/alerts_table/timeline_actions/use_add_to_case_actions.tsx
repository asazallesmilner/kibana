/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { CommentType } from '@kbn/cases-plugin/common';
import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import { GuidedOnboardingTourStep } from '../../../../common/components/guided_onboarding_tour/tour_step';
import {
  AlertsCasesTourSteps,
  SecurityStepId,
} from '../../../../common/components/guided_onboarding_tour/tour_config';
import { useTourContext } from '../../../../common/components/guided_onboarding_tour';
import { useGetUserCasesPermissions, useKibana } from '../../../../common/lib/kibana';
import type { TimelineNonEcsData } from '../../../../../common/search_strategy';
import type { Ecs } from '../../../../../common/ecs';
import { ADD_TO_EXISTING_CASE, ADD_TO_NEW_CASE } from '../translations';

export interface UseAddToCaseActions {
  onMenuItemClick: () => void;
  ariaLabel?: string;
  ecsData?: Ecs;
  nonEcsData?: TimelineNonEcsData[];
  onSuccess?: () => Promise<void>;
  isActiveTimelines: boolean;
  isInDetections: boolean;
}

export const useAddToCaseActions = ({
  onMenuItemClick,
  ariaLabel,
  ecsData,
  nonEcsData,
  onSuccess,
  isActiveTimelines,
  isInDetections,
}: UseAddToCaseActions) => {
  const { cases: casesUi } = useKibana().services;
  const userCasesPermissions = useGetUserCasesPermissions();

  const isAlert = useMemo(() => {
    return ecsData?.event?.kind?.includes('signal');
  }, [ecsData]);

  const caseAttachments: CaseAttachmentsWithoutOwner = useMemo(() => {
    return ecsData?._id
      ? [
          {
            alertId: ecsData?._id ?? '',
            index: ecsData?._index ?? '',
            type: CommentType.alert,
            rule: casesUi.helpers.getRuleIdFromEvent({ ecs: ecsData, data: nonEcsData ?? [] }),
          },
        ]
      : [];
  }, [casesUi.helpers, ecsData, nonEcsData]);

  const { activeStep, endTourStep, incrementStep, isTourShown } = useTourContext();

  const afterCaseCreated = useCallback(async () => {
    if (isTourShown(SecurityStepId.alertsCases)) {
      endTourStep(SecurityStepId.alertsCases);
    }
  }, [endTourStep, isTourShown]);

  const createCaseFlyout = casesUi.hooks.getUseCasesAddToNewCaseFlyout({
    onClose: onMenuItemClick,
    onSuccess,
    afterCaseCreated,
  });

  const selectCaseModal = casesUi.hooks.getUseCasesAddToExistingCaseModal({
    onClose: onMenuItemClick,
    onRowClick: onSuccess,
  });

  const handleAddToNewCaseClick = useCallback(() => {
    // TODO rename this, this is really `closePopover()`
    onMenuItemClick();
    createCaseFlyout.open({
      attachments: caseAttachments,
      // activeStep will be 4 on first render because not yet incremented
      // if the user closes the flyout without completing the form and comes back, we will be at step 5
      ...(isTourShown(SecurityStepId.alertsCases) &&
      (activeStep === AlertsCasesTourSteps.addAlertToCase ||
        activeStep === AlertsCasesTourSteps.createCase)
        ? {
            headerContent: (
              // isTourAnchor=true no matter what in order to
              // force active guide step outside of security solution (cases)
              <GuidedOnboardingTourStep isTourAnchor step={5} stepId={SecurityStepId.alertsCases} />
            ),
          }
        : {}),
    });
    if (
      isTourShown(SecurityStepId.alertsCases) &&
      activeStep === AlertsCasesTourSteps.addAlertToCase
    ) {
      incrementStep(SecurityStepId.alertsCases);
    }
  }, [onMenuItemClick, createCaseFlyout, caseAttachments, isTourShown, activeStep, incrementStep]);

  const handleAddToExistingCaseClick = useCallback(() => {
    // TODO rename this, this is really `closePopover()`
    onMenuItemClick();
    selectCaseModal.open({ attachments: caseAttachments });
  }, [caseAttachments, onMenuItemClick, selectCaseModal]);

  const addToCaseActionItems = useMemo(() => {
    if (
      (isActiveTimelines || isInDetections) &&
      userCasesPermissions.create &&
      userCasesPermissions.read &&
      isAlert
    ) {
      return [
        // add to existing case menu item
        <EuiContextMenuItem
          aria-label={ariaLabel}
          data-test-subj="add-to-existing-case-action"
          onClick={handleAddToExistingCaseClick}
          size="s"
        >
          {ADD_TO_EXISTING_CASE}
        </EuiContextMenuItem>,
        // add to new case menu item
        <EuiContextMenuItem
          aria-label={ariaLabel}
          data-test-subj="add-to-new-case-action"
          onClick={handleAddToNewCaseClick}
          size="s"
        >
          {ADD_TO_NEW_CASE}
        </EuiContextMenuItem>,
      ];
    }
    return [];
  }, [
    ariaLabel,
    handleAddToExistingCaseClick,
    handleAddToNewCaseClick,
    userCasesPermissions.create,
    userCasesPermissions.read,
    isInDetections,
    isActiveTimelines,
    isAlert,
  ]);

  return {
    addToCaseActionItems,
  };
};
