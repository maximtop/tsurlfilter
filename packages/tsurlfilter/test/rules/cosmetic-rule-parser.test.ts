import { CosmeticRuleParser } from '../../src/rules/cosmetic-rule-parser';

describe('CosmeticRuleParser', () => {
    it('parse rule text by marker', () => {
        expect(CosmeticRuleParser.parseRuleTextByMarker('example.org##.banner')).toEqual({
            pattern: 'example.org',
            marker: '##',
            content: '.banner',
        });

        expect(CosmeticRuleParser.parseRuleTextByMarker('*##.banner')).toEqual({
            pattern: '*',
            marker: '##',
            content: '.banner',
        });

        expect(CosmeticRuleParser.parseRuleTextByMarker('#@#.banner')).toEqual({
            marker: '#@#',
            content: '.banner',
        });

        expect(() => {
            CosmeticRuleParser.parseRuleTextByMarker('||example.org^');
        }).toThrow(new SyntaxError('Not a cosmetic rule'));

        expect(() => {
            CosmeticRuleParser.parseRuleTextByMarker('example.org##');
        }).toThrow(new SyntaxError('Rule content is empty'));
    });

    it('parse rule pattern text', () => {
        expect(CosmeticRuleParser.parseRulePatternText('example.org')).toEqual({
            domainsText: 'example.org',
        });

        expect(CosmeticRuleParser.parseRulePatternText('[$path=/page]example.org,another.com')).toEqual({
            domainsText: 'example.org,another.com',
            modifiersText: 'path=/page',
        });

        expect(CosmeticRuleParser.parseRulePatternText('[$path=/page]')).toEqual({
            modifiersText: 'path=/page',
        });

        expect(() => {
            CosmeticRuleParser.parseRulePatternText('[$path=/pageexample.org');
        }).toThrow(new SyntaxError('Can\'t parse modifiers list'));

        expect(() => {
            CosmeticRuleParser.parseRulePatternText('[$]');
        }).toThrow(new SyntaxError('Modifiers list can\'t be empty'));
    });

    it('parse and extracts rule modifiers from modifiers text', () => {
        expect(CosmeticRuleParser.parseRuleModifiers('path=/page')).toEqual({
            path: '/page',
        });

        expect(CosmeticRuleParser.parseRuleModifiers(',domain=example.com')).toEqual({
            domain: 'example.com',
        });

        expect(CosmeticRuleParser.parseRuleModifiers('path=/page,domain=example.com')).toEqual({
            path: '/page',
            domain: 'example.com',
        });

        expect(CosmeticRuleParser.parseRuleModifiers('path=/page,domain=exa\\,mple.com,')).toEqual({
            path: '/page',
            domain: 'exa\\,mple.com',
        });

        expect(CosmeticRuleParser.parseRuleModifiers('')).toEqual(null);

        expect(() => {
            CosmeticRuleParser.parseRuleModifiers('domain,path=/page*.html');
        }).toThrow(new SyntaxError('Modifier must have assigned value'));

        expect(() => {
            CosmeticRuleParser.parseRuleModifiers('test=example.com,path=/page*.html');
        }).toThrow(new SyntaxError('\'test\' is not valid modifier'));
    });

    it('parse and extracts the permitted/restricted domains and the unescaped path modifier value', () => {
        expect(CosmeticRuleParser.parseRulePattern('example.org')).toEqual({
            permittedDomains: ['example.org'],
        });

        expect(CosmeticRuleParser.parseRulePattern('example.org,another.com')).toEqual({
            permittedDomains: ['example.org', 'another.com'],
        });

        expect(CosmeticRuleParser.parseRulePattern('*')).toEqual({});

        expect(CosmeticRuleParser.parseRulePattern('example.org,~another.com')).toEqual({
            permittedDomains: ['example.org'],
            restrictedDomains: ['another.com'],
        });

        expect(CosmeticRuleParser.parseRulePattern('[$path=/page]example.org,~another.com')).toEqual({
            permittedDomains: ['example.org'],
            restrictedDomains: ['another.com'],
            path: '/page',
        });

        expect(CosmeticRuleParser.parseRulePattern('[$path=/page,domain=example.org|~another.com]')).toEqual({
            permittedDomains: ['example.org'],
            restrictedDomains: ['another.com'],
            path: '/page',
        });

        expect(CosmeticRuleParser.parseRulePattern(String.raw`[$path=/\[^a|b|c|\,|d|\\]\]werty\\?=qwe/]`)).toEqual({
            path: String.raw`/[^a|b|c|,|d|\]]werty\?=qwe/`,
        });

        expect(() => {
            CosmeticRuleParser.parseRulePattern('[$path=/page,domain=example.org]~another.com');
        }).toThrow(new SyntaxError('The $domain modifier is not allowed in a domain-specific rule'));
    });
});
