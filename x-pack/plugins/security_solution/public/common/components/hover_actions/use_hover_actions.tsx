/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState, useRef, useContext } from 'react';
import type { DraggableProvided, DraggableStateSnapshot } from 'react-beautiful-dnd';
import { TableContext } from '@kbn/timelines-plugin/public';
import { TimelineContext } from '../../../timelines/components/timeline';
import { HoverActions } from '.';

import type { DataProvider } from '../../../../common/types';
import { ProviderContentWrapper } from '../drag_and_drop/draggable_wrapper';
import { getDraggableId } from '../drag_and_drop/helpers';

const draggableContainsLinks = (draggableElement: HTMLDivElement | null) => {
  const links = draggableElement?.querySelectorAll('.euiLink') ?? [];
  return links.length > 0;
};

type RenderFunctionProp = (
  props: DataProvider,
  provided: DraggableProvided | null,
  state: DraggableStateSnapshot
) => React.ReactNode;

interface Props {
  dataProvider: DataProvider;
  isAggregatable: boolean;
  fieldType: string;
  disabled?: boolean;
  hideTopN: boolean;
  isDraggable?: boolean;
  inline?: boolean;
  render: RenderFunctionProp;
  scopeId?: string;
  truncate?: boolean;
  onFilterAdded?: () => void;
}

export const useHoverActions = ({
  dataProvider,
  isAggregatable,
  fieldType,
  hideTopN,
  isDraggable,
  onFilterAdded,
  render,
  scopeId,
}: Props) => {
  const { timelineId: timelineIdFind } = useContext(TimelineContext);
  const { tableId: tableIdFind } = useContext(TableContext);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const keyboardHandlerRef = useRef<HTMLDivElement | null>(null);
  const [closePopOverTrigger, setClosePopOverTrigger] = useState(false);
  const [showTopN, setShowTopN] = useState<boolean>(false);
  const [hoverActionsOwnFocus, setHoverActionsOwnFocus] = useState<boolean>(false);
  const id = useMemo(
    () => (!scopeId ? timelineIdFind ?? tableIdFind : scopeId),
    [scopeId, tableIdFind, timelineIdFind]
  );

  const handleClosePopOverTrigger = useCallback(() => {
    setClosePopOverTrigger((prevClosePopOverTrigger) => !prevClosePopOverTrigger);
    setHoverActionsOwnFocus((prevHoverActionsOwnFocus) => {
      if (prevHoverActionsOwnFocus) {
        setTimeout(() => {
          keyboardHandlerRef.current?.focus();
        }, 0);
      }
      return false; // always give up ownership
    });

    setTimeout(() => {
      setHoverActionsOwnFocus(false);
    }, 0); // invoked on the next tick, because we want to restore focus first
  }, [keyboardHandlerRef]);

  const toggleTopN = useCallback(() => {
    setShowTopN((prevShowTopN) => {
      const newShowTopN = !prevShowTopN;
      if (newShowTopN === false) {
        handleClosePopOverTrigger();
      }
      return newShowTopN;
    });
  }, [handleClosePopOverTrigger]);

  const closeTopN = useCallback(() => {
    setShowTopN(false);
  }, []);

  const hoverContent = useMemo(() => {
    // display links as additional content in the hover menu to enable keyboard
    // navigation of links (when the draggable contains them):
    const additionalContent =
      hoverActionsOwnFocus && !showTopN && draggableContainsLinks(containerRef.current) ? (
        <ProviderContentWrapper
          data-test-subj={`draggable-link-content-${dataProvider.queryMatch.field}`}
        >
          {render(dataProvider, null, { isDragging: false, isDropAnimating: false })}
        </ProviderContentWrapper>
      ) : null;

    return (
      <HoverActions
        additionalContent={additionalContent}
        closeTopN={closeTopN}
        closePopOver={handleClosePopOverTrigger}
        dataProvider={dataProvider}
        draggableId={isDraggable ? getDraggableId(dataProvider.id) : undefined}
        field={dataProvider.queryMatch.field}
        isAggregatable={isAggregatable}
        fieldType={fieldType}
        hideTopN={hideTopN}
        isObjectArray={false}
        onFilterAdded={onFilterAdded}
        ownFocus={hoverActionsOwnFocus}
        showOwnFocus={false}
        showTopN={showTopN}
        scopeId={id}
        toggleTopN={toggleTopN}
        values={
          typeof dataProvider.queryMatch.value !== 'number'
            ? dataProvider.queryMatch.value
            : `${dataProvider.queryMatch.value}`
        }
      />
    );
  }, [
    hoverActionsOwnFocus,
    showTopN,
    dataProvider,
    render,
    closeTopN,
    handleClosePopOverTrigger,
    isDraggable,
    isAggregatable,
    fieldType,
    hideTopN,
    onFilterAdded,
    id,
    toggleTopN,
  ]);

  const setContainerRef = useCallback((e: HTMLDivElement) => {
    containerRef.current = e;
  }, []);

  const onFocus = useCallback(() => {
    if (!hoverActionsOwnFocus) {
      keyboardHandlerRef.current?.focus();
    }
  }, [hoverActionsOwnFocus, keyboardHandlerRef]);

  const onCloseRequested = useCallback(() => {
    setShowTopN(false);

    if (hoverActionsOwnFocus) {
      setHoverActionsOwnFocus(false);

      setTimeout(() => {
        onFocus(); // return focus to this draggable on the next tick, because we owned focus
      }, 0);
    }
  }, [onFocus, hoverActionsOwnFocus]);

  const openPopover = useCallback(() => {
    setHoverActionsOwnFocus(true);
  }, []);

  return useMemo(
    () => ({
      closePopOverTrigger,
      handleClosePopOverTrigger,
      hoverActionsOwnFocus,
      hoverContent,
      keyboardHandlerRef,
      onCloseRequested,
      onFocus,
      openPopover,
      setContainerRef,
      showTopN,
    }),
    [
      closePopOverTrigger,
      handleClosePopOverTrigger,
      hoverActionsOwnFocus,
      hoverContent,
      onCloseRequested,
      onFocus,
      openPopover,
      setContainerRef,
      showTopN,
    ]
  );
};
