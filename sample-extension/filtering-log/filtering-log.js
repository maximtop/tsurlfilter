/* eslint-disable no-console */

/**
 * Filtering log
 */
export class FilteringLog {
    /**
     * Constructor
     */
    constructor() {
        // Add listener for css hits
        // eslint-disable-next-line no-undef
        chrome.runtime.onMessage.addListener(
            (request, sender) => {
                if (request.type === 'saveCssHitStats') {
                    const { id, url } = sender.tab;
                    const stats = JSON.parse(request.stats);
                    stats.forEach((s) => {
                        // Mock rule
                        const rule = {
                            getFilterListId() {
                                return s.filterId;
                            },
                            getText() {
                                return s.ruleText;
                            },
                        };

                        this.addCosmeticEvent(id, s.element, url, rule);
                    });
                }
            },
        );
    }


    /**
     * Add request to log
     *
     * @param {Number} tabId - tab id
     * @param {String} requestUrl - url
     * @param {Object} requestRule - rule
     */
    addHttpRequestEvent(tabId, requestUrl, requestRule) {
        const filteringEvent = {
            eventType: 'REQUEST',
            requestUrl,
            rule: requestRule,
        };

        this.pushFilteringEvent(filteringEvent);
    }

    /**
     * Add event to log with the corresponding rule
     *
     * @param {Number} tabId - tab id
     * @param {String} elementString - element string presentation
     * @param {String} frameUrl - Frame url
     * @param {Object} rule - css rule
     */
    addCosmeticEvent(tabId, elementString, frameUrl, rule) {
        if (!rule) {
            return;
        }

        const filteringEvent = {
            eventType: 'CSS',
            element: elementString,
            frameUrl,
            rule,
        };

        this.pushFilteringEvent(filteringEvent);
    }

    /**
     * Add script event to log with the corresponding rule
     *
     * @param {Number} tabId - tab id
     * @param {String} frameUrl - Frame url
     * @param {Object} rule - script rule
     */
    addScriptInjectionEvent(tabId, frameUrl, rule) {
        const filteringEvent = {
            eventType: 'SCRIPT',
            frameUrl,
            rule,
        };

        this.pushFilteringEvent(filteringEvent);
    }

    /**
     * Add cookie event to log
     *
     * @param {Number} tabId - tab id
     * @param {String} frameUrl - Frame url
     * @param {Object} rule - cookie rule
     */
    addCookieEvent(tabId, frameUrl, rule) {
        const filteringEvent = {
            eventType: 'COOKIE',
            frameUrl,
            rule,
        };

        this.pushFilteringEvent(filteringEvent);
    }

    /**
     * Add html rule event to log
     *
     * @param {Number} tabId - tab id
     * @param {String} elementString - element string presentation
     * @param {String} frameUrl - Frame url
     * @param {Object} rule - cookie rule
     */
    addHtmlEvent(tabId, elementString, frameUrl, rule) {
        const filteringEvent = {
            eventType: 'HTML',
            element: elementString,
            frameUrl,
            rule,
        };

        this.pushFilteringEvent(filteringEvent);
    }

    /**
     * Add html rule event to log
     *
     * @param {Number} tabId - tab id
     * @param {String} frameUrl - Frame url
     * @param {Object} rules - cookie rule
     */
    addReplaceRulesEvent(tabId, frameUrl, rules) {
        rules.forEach((r) => {
            this.pushFilteringEvent({
                eventType: 'REPLACE',
                frameUrl,
                rule: r,
            });
        });
    }

    /**
     * Add stealth event
     *
     * @param tabId
     * @param frameUrl
     * @param action
     */
    addStealthEvent(tabId, frameUrl, action) {
        const filteringEvent = {
            eventType: 'STEALTH',
            frameUrl,
            action,
        };

        this.pushFilteringEvent(filteringEvent);
    }

    /**
     * Add dns event
     *
     * @param tabId
     * @param frameUrl
     * @param rules
     */
    addDnsEvent(tabId, frameUrl, rules) {
        const filteringEvent = {
            eventType: 'DNS',
            frameUrl,
            rules,
        };

        this.pushFilteringEvent(filteringEvent);
    }

    /**
     * Push event to listeners
     *
     * TODO: This is the place to notify UI
     *
     * @param event
     */
    // eslint-disable-next-line class-methods-use-this
    pushFilteringEvent(event) {
        // Temp implementation

        if (event.eventType === 'REQUEST') {
            console.log(`[FILTERING-LOG] Request: ${event.requestUrl}`);
        }

        if (event.eventType === 'STEALTH') {
            console.log(`[FILTERING-LOG] Request: ${event.frameUrl} Stealth action: ${event.action}`);
        }

        if (event.eventType === 'DNS') {
            console.log(`[FILTERING-LOG] Request: ${event.frameUrl} Host level rules found: ${event.rules.length}`);
        }

        if (event.rule) {
            console.log(`[FILTERING-LOG][${event.eventType}] Event rule: ${event.rule.getText()}`);
        }
    }
}
