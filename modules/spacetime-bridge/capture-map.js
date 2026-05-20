/*
Traps window.maplibregl to capture SpaceTime's MapLibre map instance.
Uses Object.defineProperty to intercept the CDN assignment before SpaceTime
calls new maplibregl.Map(), then wraps the constructor to capture the instance.
Must be called during Foundry's 'init' hook.
*/

let _resolve = null;
let _instance = null;
const _promise = new Promise(r => { _resolve = r; });

export function setupMapCapture() {
    // maplibregl already present (e.g. hot-reload scenario)
    if (window.maplibregl?.Map) {
        _wrapConstructor(window.maplibregl);
        return;
    }
    // Already trapped by a prior call
    if (Object.getOwnPropertyDescriptor(window, 'maplibregl')?.set) return;

    let _stored = window.maplibregl;
    Object.defineProperty(window, 'maplibregl', {
        configurable: true,
        enumerable: true,
        get() { return _stored; },
        set(val) {
            _stored = val;
            if (val?.Map) {
                _wrapConstructor(val);
                // Restore as a plain writable property so SpaceTime sees normal behaviour
                Object.defineProperty(window, 'maplibregl', {
                    configurable: true, writable: true, enumerable: true, value: val
                });
            }
        }
    });
}

export function waitForMap() {
    return _promise;
}

export function getMap() {
    return _instance;
}

function _wrapConstructor(lib) {
    const Orig = lib.Map;
    lib.Map = function(...args) {
        // Reflect.construct preserves MapLibre's internal new.target behaviour
        const inst = Reflect.construct(Orig, args, Orig);
        _instance = inst;
        if (_resolve) { _resolve(inst); _resolve = null; }
        return inst;
    };
    lib.Map.prototype = Orig.prototype;
    Object.assign(lib.Map, Orig);
}
