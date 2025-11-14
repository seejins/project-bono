declare module '@hello-pangea/dnd' {
  import type {
    DropResult,
    DroppableProvided,
    DroppableStateSnapshot,
    DraggableProvided,
    DraggableStateSnapshot,
  } from 'react-beautiful-dnd';
  import {
    DragDropContext as RBCDragDropContext,
    Droppable as RBCDroppable,
    Draggable as RBCDraggable,
  } from 'react-beautiful-dnd';

  export type {
    DropResult,
    DroppableProvided,
    DroppableStateSnapshot,
    DraggableProvided,
    DraggableStateSnapshot,
  };

  export const DragDropContext: typeof RBCDragDropContext;
  export const Droppable: typeof RBCDroppable;
  export const Draggable: typeof RBCDraggable;

  export * from 'react-beautiful-dnd';
  export { default } from 'react-beautiful-dnd';
}

