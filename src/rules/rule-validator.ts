import { CosmeticRule } from './cosmetic-rule';
import { RuleFactory } from './rule-factory';
import { NetworkRule } from './network-rule';

interface ValidationResult {
    result: boolean;
    error: string | null;
}

export class RuleValidator {
    /**
     * Creates validation result
     * @param result
     * @param error
     * @private
     */
    public static createValidationResult(result: boolean, error?: string): ValidationResult {
        if (error) {
            return { result, error };
        }

        return { result, error: null };
    }

    /**
     * Validates raw rule string
     * @param rawRule
     */
    public static validate(rawRule: string): ValidationResult {
        const rule = rawRule.trim();

        if (RuleFactory.isShort(rule)) {
            return RuleValidator.createValidationResult(false, `Rule is too short: ${rule}`);
        }

        if (RuleFactory.isComment(rule)) {
            return RuleValidator.createValidationResult(true);
        }

        if (RuleFactory.isCosmetic(rule)) {
            try {
                new CosmeticRule(rule, 0);
                return RuleValidator.createValidationResult(true);
            } catch (e) {
                return RuleValidator.createValidationResult(false, e.message);
            }
        }

        try {
            new NetworkRule(rule, 0);
        } catch (e) {
            return RuleValidator.createValidationResult(false, e.message);
        }

        return RuleValidator.createValidationResult(true);
    }
}
