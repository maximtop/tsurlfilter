/* eslint-disable max-len */
import fs from 'fs';
import zlib from 'zlib';
import console from 'console';
import { performance } from 'perf_hooks';
import {
    type IRuleList,
    CosmeticOption,
    Engine,
    Request,
    RequestType,
    BufferRuleList,
    StringRuleList,
    RuleStorage,
    DnsEngine,
    CosmeticEngine,
    setLogger,
} from '../../src';

/**
 * The comment below describes the bench test results that are achieved on
 * different machines. The results are not stable and can vary from machine to
 * machine, so you need to include your configuration in the comment.
 *
 * Machine: MPB, M1 Max, 32GB Ram, node v20.5.0.
 * ========================================================================
 *
 * Benchmark: "Benchmarks runs network-engine with a StringRuleList storage"
 * ========================================================================
 *
 * Elapsed on parsing rules: 225 ms
 * Engine memory: 22.81 MB total heap size, 16.07 MB used
 * Average per request: 17.123 μs
 * Max per request: 1476.125 μs
 * Min per request: 0.208 μs
 * Allocations + cache overhead: 5.5 MB total heap size, 9.86 MB used
 *
 * Benchmark: "Benchmarks runs network-engine with a BufferRuleList storage"
 * ========================================================================
 *
 * Elapsed on parsing rules: 225 ms
 * Engine memory: 22.81 MB total heap size, 24.83 MB used
 * Average per request: 16.824 μs
 * Max per request: 1568.999 μs
 * Min per request: 0.208 μs
 * Allocations + cache overhead: 5.5 MB total heap size, -5.22 MB used
 *
 * Note: negative values are possible, we don't control GC in these tests.
 *
 * Benchmark: "Benchmarks runs network-engine with async load"
 * ========================================================================
 *
 * Elapsed on parsing rules: 181 ms
 * Note: smaller time elapsed on parsing is due to how the rules are loaded in
 * the Engine. If the rules are loaded synchronously, then the engine does
 * several scans for every engine (network, cosmetic).
 *
 * Benchmark: "Benchmarks runs dns-engine with a StringRuleList storage"
 * ========================================================================
 *
 * Elapsed on parsing rules: 97 ms
 * Engine memory: 21.36 MB total heap size, 31.18 MB used
 * Average per request: 3.759 μs
 * Max per request: 1471.125 μs
 * Min per request: 0.875 μs
 * Allocations + cache overhead: 18 MB total heap size, 7.69 MB used
 *
 * Benchmark: "Benchmarks runs dns-engine with a BufferRuleList storage"
 * ========================================================================
 *
 * Elapsed on parsing rules: 109 ms
 * Engine memory: 19.8 MB total heap size, 22.63 MB used
 * Average per request: 3.931 μs
 * Max per request: 2691.5 μs
 * Min per request: 0.916 μs
 * Allocations + cache overhead: 15.25 MB total heap size, 18.23 MB used
 *
 * Benchmark: "Benchmarks runs cosmetic-engine with a StringRuleList storage"
 * ========================================================================
 *
 * Elapsed on parsing rules: 212 ms
 * Engine memory: 14.98 MB total heap size, 27.08 MB used
 * Average per request: 105.499 μs
 * Max per request: 9642.167 μs
 * Min per request: 0 μs
 * Allocations + cache overhead: 10.69 MB total heap size, 8.16 MB used
 *
 * Benchmark: "Benchmarks runs cosmetic-engine with a BufferRuleList storage"
 * ========================================================================
 *
 * Elapsed on parsing rules: 232 ms
 * Engine memory: 16.23 MB total heap size, 23.74 MB used
 * Average per request: 104.447 μs
 * Max per request: 8816.25 μs
 * Min per request: 0 μs
 * Allocations + cache overhead: 8.94 MB total heap size, 8.94 MB used
 */

/**
 * Resources file paths
 */
const requestsZipFilePath = './test/resources/requests.json.gz';
const expectedRequestsCount = 27969;
const requestsFilePath = './test/resources/requests.json';

function isSupportedURL(url: string): boolean {
    return (!!url && (url.startsWith('http') || url.startsWith('ws')));
}

async function unzipRequests(): Promise<void> {
    return new Promise((resolve, reject) => {
        const fileContents = fs.createReadStream(requestsZipFilePath);
        const writeStream = fs.createWriteStream(requestsFilePath);
        const unzip = zlib.createGunzip();

        fileContents.pipe(unzip).pipe(writeStream).on('close', () => {
            resolve();
        }).on('error', () => {
            reject();
        });
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadRequests(): Promise<any[]> {
    await unzipRequests();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requests: any[] = [];
    const data = await fs.promises.readFile(requestsFilePath, 'utf8');
    data.split('\n').forEach((line) => {
        if (line) {
            const request = JSON.parse(line);
            if (isSupportedURL(request.url) && isSupportedURL(request.frameUrl)) {
                requests.push(request);
            }
        }
    });

    console.log(`Loaded requests: ${requests.length}`);

    return requests;
}

function testGetRequestType(requestType: string): RequestType {
    switch (requestType) {
        case 'document':
            // Consider document requests as sub_document. This is because the request
            // dataset does not contain sub_frame or main_frame but only 'document'.
            return RequestType.SubDocument;
        case 'stylesheet':
            return RequestType.Stylesheet;
        case 'font':
            return RequestType.Font;
        case 'image':
            return RequestType.Image;
        case 'media':
            return RequestType.Media;
        case 'script':
            return RequestType.Script;
        case 'xhr':
        case 'fetch':
            return RequestType.XmlHttpRequest;
        case 'websocket':
            return RequestType.WebSocket;
        default:
            return RequestType.Other;
    }
}

async function parseRequests(): Promise<Request[]> {
    const testRequests = await loadRequests();
    expect(testRequests.length).toBe(expectedRequestsCount);

    const requests: Request[] = [];
    testRequests.forEach((t) => {
        requests.push(new Request(t.url, t.frameUrl, testGetRequestType(t.cpt)));
    });

    return requests;
}

function memoryUsage(base = { heapUsed: 0, heapTotal: 0 }) {
    let { heapUsed, heapTotal } = process.memoryUsage();

    heapUsed -= base.heapUsed;
    heapTotal -= base.heapTotal;

    return ({ heapUsed, heapTotal });
}

function runEngine(requests: Request[], matchFunc: (r: Request) => boolean): number {
    console.log(`Processing ${requests.length} requests...`);

    let totalMatches = 0;
    let totalElapsed = 0;
    let minElapsedMatch = 100 * 1000; // 100 seconds
    let maxElapsedMatch = 0;

    for (let i = 0; i < requests.length; i += 1) {
        if (i !== 0 && i % 10000 === 0) {
            console.log(`Processed ${i} requests`);
        }

        const req = requests[i];

        const startMatch = performance.now();

        if (matchFunc(req)) {
            totalMatches += 1;
        }

        const elapsedMatch = performance.now() - startMatch;
        totalElapsed += elapsedMatch;

        if (elapsedMatch > maxElapsedMatch) {
            maxElapsedMatch = elapsedMatch;
        }
        if (elapsedMatch < minElapsedMatch) {
            minElapsedMatch = elapsedMatch;
        }
    }

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    const round = (val: number) => Math.round(val * 1000 * 1000) / 1000;

    console.log(`Total matches: ${totalMatches}`);
    console.log(`Total elapsed: ${round(totalElapsed)} μs`);
    console.log(`Average per request: ${round(totalElapsed / requests.length)} μs`);
    console.log(`Max per request: ${round(maxElapsedMatch)} μs`);
    console.log(`Min per request: ${round(minElapsedMatch)} μs`);

    return totalMatches;
}

describe('Benchmarks', () => {
    beforeAll(() => {
        /* eslint-disable @typescript-eslint/no-unused-vars */
        setLogger({
            error(message?: string): void {
            },
            info(message?: string): void {
            },
            debug(message?: string): void {
            },
            warn(message?: string): void {
            },
        });
        /* eslint-disable @typescript-eslint/no-unused-vars */
    });

    beforeEach(() => {
        console.log(`Benchmark: "${expect.getState().currentTestName}"`);
    });

    afterEach(() => {
        console.log('\n');
    });

    afterAll(() => {
        setLogger(console);
    });

    /**
     * Using a generic constructor to trick typescrpit into accepting a class
     * that extends IRuleList as a function argument (see below).
     */
    interface IRuleListConstructor<T extends IRuleList> {
        new(...args: any[]): T;
    }

    /**
     * Helper function that formats memory usage.
     *
     * @param mem - Memory usage info.
     */
    function formatMemory(mem: { heapTotal: number, heapUsed: number }): string {
        function formatBytes(b: number): string {
            if (b === 0) return '0 Bytes';

            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

            const i = Math.floor(Math.log(Math.abs(b)) / Math.log(k));

            return `${parseFloat((b / k ** i).toFixed(2))} ${sizes[i]}`;
        }

        return `${formatBytes(mem.heapTotal)} total heap size, ${formatBytes(mem.heapUsed)} used`;
    }

    /**
     * Runs a bench on the Engine, but limits rules to network rules only.
     * Effectively, it only tests the network engine. This function allows
     * parameterizing the storage type (IRuleList). This test ignores cosmetic
     * rules.
     *
     * @param listClass - controls that IRuleList implementation will be used
     * when running the test.
     * @param loadAsync - controls how the NetworkEngine will be initialized
     * (synchronously or not).
     */
    async function benchNetworkEngine<T extends IRuleList>(listClass: IRuleListConstructor<T>, loadAsync: boolean) {
        const rulesFilePath = './test/resources/easylist.txt';

        /**
         * Expected matches for specified requests and rules
         */
        const expectedMatchesCount = 4667;
        const expectedLoadedRules = 38577;

        const baseMem = memoryUsage();
        const requests = await parseRequests();

        const initMem = memoryUsage(baseMem);
        const filterText = await fs.promises.readFile(rulesFilePath, 'utf8');

        console.log(`Memory after initialization: ${formatMemory(initMem)}`);

        const startParse = Date.now();
        const ignoreCosmetic = true;

        // eslint-disable-next-line new-cap
        const list = new listClass(1, filterText, ignoreCosmetic);
        const ruleStorage = new RuleStorage([list]);

        const engine = new Engine(ruleStorage, loadAsync);

        if (loadAsync) {
            const chunkSize = 1000;
            await engine.loadRulesAsync(chunkSize);
        }

        expect(engine).toBeTruthy();
        expect(engine.getRulesCount()).toBe(expectedLoadedRules);

        console.log(`Loaded rules: ${engine.getRulesCount()}`);
        console.log(`Elapsed on parsing rules: ${Date.now() - startParse} ms`);

        const engineMem = memoryUsage(baseMem);
        const engineUsageMem = {
            heapTotal: engineMem.heapTotal - initMem.heapTotal,
            heapUsed: engineMem.heapUsed - initMem.heapUsed,
        };

        console.log(`Memory after engine initialization: ${formatMemory(engineMem)}`);
        console.log(`Engine memory: ${formatMemory(engineUsageMem)}`);

        const totalMatches = runEngine(requests, (request) => {
            const matchingResult = engine.matchRequest(request);

            return !!(matchingResult
                && matchingResult.basicRule
                && !matchingResult.basicRule.isAllowlist());
        });

        expect(totalMatches).toBe(expectedMatchesCount);

        const matchingMem = memoryUsage(baseMem);
        const matchingOverheadMem = {
            heapTotal: matchingMem.heapTotal - engineMem.heapTotal,
            heapUsed: matchingMem.heapUsed - engineMem.heapUsed,
        };

        console.log(`Cache size after matching: ${ruleStorage.getCacheSize()}`);
        console.log(`Memory after matching: ${formatMemory(matchingMem)}`);
        console.log(`Allocations + cache overhead: ${formatMemory(matchingOverheadMem)}`);
    }

    /**
     * Runs a bench on the DnsEngine. This function allows parameterizing the
     * storage type (IRuleList). This test ignores cosmetic rules.
     *
     * @param listClass - controls that IRuleList implementation will be used
     * when running the test.
     */
    async function benchDnsEngine<T extends IRuleList>(listClass: IRuleListConstructor<T>) {
        const rulesFilePath = './test/resources/adguard_sdn_filter.txt';
        const hostsFilePath = './test/resources/hosts';

        /**
         * Expected matches for specified requests and rules
         */
        const expectedMatchesCount = 11043;

        const baseMem = memoryUsage();
        const requests = await parseRequests();
        const rulesText = await fs.promises.readFile(rulesFilePath, 'utf8');
        const hostsText = await fs.promises.readFile(hostsFilePath, 'utf8');

        const initMem = memoryUsage(baseMem);
        console.log(`Memory after initialization: ${formatMemory(initMem)})`);

        const startParse = Date.now();
        // eslint-disable-next-line new-cap
        const ruleList = new listClass(1, rulesText, true);
        // eslint-disable-next-line new-cap
        const hostsList = new listClass(2, hostsText, true);
        const ruleStorage = new RuleStorage([ruleList, hostsList]);

        const engine = new DnsEngine(ruleStorage);
        expect(engine).toBeTruthy();

        console.log(`Loaded rules: ${engine.rulesCount}`);
        console.log(`Elapsed on parsing rules: ${Date.now() - startParse} ms`);

        const engineMem = memoryUsage(baseMem);
        const engineUsageMem = {
            heapTotal: engineMem.heapTotal - initMem.heapTotal,
            heapUsed: engineMem.heapUsed - initMem.heapUsed,
        };
        console.log(`Memory after loading rules: ${formatMemory(engineMem)}`);
        console.log(`Engine memory: ${formatMemory(engineUsageMem)}`);

        const totalMatches = runEngine(requests, (request) => {
            const dnsResult = engine.match(request.hostname);
            if (dnsResult.basicRule) {
                if (!dnsResult.basicRule.isAllowlist()) {
                    return true;
                }
            } else if (dnsResult.hostRules.length > 0) {
                return true;
            }

            return false;
        });

        expect(totalMatches).toBe(expectedMatchesCount);

        const matchingMem = memoryUsage(baseMem);
        const matchingOverheadMem = {
            heapTotal: matchingMem.heapTotal - engineMem.heapTotal,
            heapUsed: matchingMem.heapUsed - engineMem.heapUsed,
        };

        console.log(`Cache size after matching: ${ruleStorage.getCacheSize()}`);
        console.log(`Memory after matching: ${formatMemory(matchingMem)}`);
        console.log(`Allocations + cache overhead: ${formatMemory(matchingOverheadMem)}`);
    }

    /**
     * Runs a bench on the CosmeticEngine. This function allows parameterizing
     * the storage type (IRuleList). This test ignores cosmetic rules.
     *
     * @param listClass - controls that IRuleList implementation will be used
     * when running the test.
     */
    async function benchCosmeticEngine<T extends IRuleList>(listClass: IRuleListConstructor<T>) {
        const rulesFilePath = './test/resources/adguard_base_filter.txt';

        /**
         * Expected matches for specified requests and rules
         */
        const expectedMatchesCount = 1754;

        const baseMem = memoryUsage();
        const requests = await parseRequests();
        const rulesText = await fs.promises.readFile(rulesFilePath, 'utf8');

        const initMem = memoryUsage(baseMem);
        console.log(`Memory after initialization: ${formatMemory(initMem)}`);

        const startParse = Date.now();
        // eslint-disable-next-line new-cap
        const list = new listClass(1, rulesText, false);
        const ruleStorage = new RuleStorage([list]);

        const engine = new CosmeticEngine(ruleStorage);
        expect(engine).toBeTruthy();

        console.log(`Loaded rules: ${engine.rulesCount}`);
        console.log(`Elapsed on parsing rules: ${Date.now() - startParse} ms`);

        const engineMem = memoryUsage(baseMem);
        const engineUsageMem = {
            heapTotal: engineMem.heapTotal - initMem.heapTotal,
            heapUsed: engineMem.heapUsed - initMem.heapUsed,
        };
        console.log(`Memory after loading rules: ${formatMemory(engineMem)}`);
        console.log(`Engine memory: ${formatMemory(engineUsageMem)}`);

        const totalMatches = runEngine(requests, (request) => {
            if (request.requestType !== RequestType.SubDocument) {
                return false;
            }

            const result = engine.match(request, CosmeticOption.CosmeticOptionAll);
            return result.elementHiding.specific.length + result.elementHiding.generic.length > 0;
        });

        expect(totalMatches).toBe(expectedMatchesCount);

        const matchingMem = memoryUsage(baseMem);
        const matchingOverheadMem = {
            heapTotal: matchingMem.heapTotal - engineMem.heapTotal,
            heapUsed: matchingMem.heapUsed - engineMem.heapUsed,
        };

        console.log(`Cache size after matching: ${ruleStorage.getCacheSize()}`);
        console.log(`Memory after matching: ${formatMemory(matchingMem)}`);
        console.log(`Allocations + cache overhead: ${formatMemory(matchingOverheadMem)}`);
    }

    it('runs network-engine with a StringRuleList storage', async () => {
        await benchNetworkEngine(StringRuleList, false);
    });

    it('runs network-engine with a BufferRuleList storage', async () => {
        await benchNetworkEngine(BufferRuleList, false);
    });

    it('runs network-engine with async load', async () => {
        await benchNetworkEngine(BufferRuleList, true);
    });

    it('runs dns-engine with a StringRuleList storage', async () => {
        await benchDnsEngine(StringRuleList);
    });

    it('runs dns-engine with a BufferRuleList storage', async () => {
        await benchDnsEngine(BufferRuleList);
    });

    it('runs cosmetic-engine with a StringRuleList storage', async () => {
        await benchCosmeticEngine(StringRuleList);
    });

    it('runs cosmetic-engine with a BufferRuleList storage', async () => {
        await benchCosmeticEngine(BufferRuleList);
    });
});
