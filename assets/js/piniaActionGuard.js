// Pinia runs every $onAction subscriber inline with the action it observes:
// a subscriber that throws aborts the action for its caller, and an after()
// callback that throws turns the action's result into a rejection. One panel
// reading briefly-empty state could thereby break an unrelated action for
// everyone (ABT #1683). This plugin keeps a subscriber's failure its own: it
// is reported with console.error (store, action, error) and the observed
// action keeps its result. Nothing is swallowed silently.

function reportSubscriberError(storeId, actionName, phase, error) {
    console.error(`[${storeId}] $onAction ${phase} for "${actionName}" threw; the action itself is unaffected:`, error);
}

function guarded(storeId, actionName, phase, callback) {
    return (...callbackArgs) => {
        try {
            return callback(...callbackArgs);
        }
        catch (error) {
            reportSubscriberError(storeId, actionName, phase, error);
        }
    };
}

export function piniaActionGuard({ store }) {
    const originalOnAction = store.$onAction;
    return {
        $onAction(subscriber, detached) {
            return originalOnAction((context) => {
                const { name, after, onError } = context;
                const guardedContext = {
                    ...context,
                    after: (callback) => after(guarded(store.$id, name, 'after() callback', callback)),
                    onError: (callback) => onError(guarded(store.$id, name, 'onError() callback', callback)),
                };
                guarded(store.$id, name, 'subscriber', subscriber)(guardedContext);
            }, detached);
        },
    };
}
