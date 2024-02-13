import { IRule } from '../rules/rule';

/**
 * Cache of an individual filter list.
 */
export class ListCache {
    /**
     * Cache with the rules which are stored inside this cache instance..
     */
    private readonly cache: Map<number, IRule>;

    /**
     * ListCache constructor.
     */
    constructor() {
        this.cache = new Map();
    }

    /**
     * @param key - Cache key.
     * @return - Rule found for specified key or undefined if nothing found.
     */
    public get(key: number): IRule | undefined {
        return this.cache.get(key);
    }

    /**
     * Stores the rule for the specified key in the cache.
     *
     * @param key - Cache key.
     * @param rule - Cached value.
     */
    public set(key: number, rule: IRule): void {
        this.cache.set(key, rule);
    }

    /**
     * @returns - The list cache size.
     */
    public getSize() {
        return this.cache.size;
    }
}
