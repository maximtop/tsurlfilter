import { findHeaderByName, removeHeader } from '../../src/utils/headers';

describe('Headers utils', () => {
    it('finds header by name', () => {
        let result = findHeaderByName([], 'test_name');
        expect(result).toBeNull();

        result = findHeaderByName([
            {
                name: 'an_other_name',
                value: 'an_other_value',
            },
        ], 'test_name');
        expect(result).toBeNull();

        result = findHeaderByName([
            {
                name: 'test_name',
                value: 'test_value',
            },
            {
                name: 'an_other_name',
                value: 'an_other_value',
            },
        ], 'test_name');
        expect(result).not.toBeNull();
        expect(result!.name).toBe('test_name');
    });

    it('removes header by name', () => {
        expect(removeHeader([], 'test_name')).toBeFalsy();

        expect(removeHeader([
            {
                name: 'an_other_name',
                value: 'an_other_value',
            },
        ], 'test_name')).toBeFalsy();

        expect(removeHeader([
            {
                name: 'test_name',
                value: 'test_value',
            },
            {
                name: 'an_other_name',
                value: 'an_other_value',
            },
        ], 'test_name')).toBeTruthy();
    });
});
