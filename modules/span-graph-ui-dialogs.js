// continuum/modules/span-graph-ui-dialogs.js

// Fragmented logic into atomic scripts per ALF Protocol
export * from './span-graph-ui-helpers.js';
export * from './span-graph-dialogs-edit.js';
export * from './span-graph-dialogs-create.js';

// Unified Event System
export { openEventDialog as openEventNodeDialog } from './lifeline/services/ui/event-dialog/open-event-dialog.js';
