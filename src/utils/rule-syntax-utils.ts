import { parse } from 'tldts';

import { RuleFactory } from '../rules/rule-factory';
import { NetworkRule } from '../rules/network-rule';
import { CosmeticRule } from '../rules/cosmetic-rule';

type RulesUnion = NetworkRule | CosmeticRule;

/**
 * Module with miscellaneous syntax utils exposed in API
 */
export class RuleSyntaxUtils {
    private static DUMMY_FILTER_ID = 0;

    public static isRuleForDomain(ruleText: string, domain: string): boolean {
        const rule = RuleFactory.createRule(ruleText, this.DUMMY_FILTER_ID) as RulesUnion | null;
        if (!rule) {
            return false;
        }
        return rule.matchesPermittedDomains(domain);
    }

    public static isRuleForUrl(ruleText: string, url: string): boolean {
        const { domain } = parse(url);

        if (!domain) {
            return false;
        }

        return this.isRuleForDomain(ruleText, domain);
    }
}
