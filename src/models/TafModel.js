// To parse this data:
//
//   const Convert = require("./file");
//
//   const tafModel = Convert.toTafModel(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
function toTafModel(json) {
    return cast(JSON.parse(json), r("TafModel"));
}

function tafModelToJson(value) {
    return JSON.stringify(uncast(value, r("TafModel")), null, 2);
}

function invalidValue(typ, val, key = '') {
    if (key) {
        throw Error(`Invalid value for key "${key}". Expected type ${JSON.stringify(typ)} but got ${JSON.stringify(val)}`);
    }
    throw Error(`Invalid value ${JSON.stringify(val)} for type ${JSON.stringify(typ)}`, );
}

function jsonToJSProps(typ) {
    if (typ.jsonToJS === undefined) {
        const map = {};
        typ.props.forEach((p) => map[p.json] = { key: p.js, typ: p.typ });
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function jsToJSONProps(typ) {
    if (typ.jsToJSON === undefined) {
        const map = {};
        typ.props.forEach((p) => map[p.js] = { key: p.json, typ: p.typ });
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}

function transform(val, typ, getProps, key = '') {
    function transformPrimitive(typ, val) {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val, key);
    }

    function transformUnion(typs, val) {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            } catch (_) {}
        }
        return invalidValue(typs, val);
    }

    function transformEnum(cases, val) {
        if (cases.indexOf(val) !== -1) return val;
        return invalidValue(cases, val);
    }

    function transformArray(typ, val) {
        // val must be an array with no invalid elements
        if (!Array.isArray(val)) return invalidValue("array", val);
        return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val) {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue("Date", val);
        }
        return d;
    }

    function transformObject(props, additional, val) {
        if (val === null || typeof val !== "object" || Array.isArray(val)) {
            return invalidValue("object", val);
        }
        const result = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, prop.key);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key);
            }
        });
        return result;
    }

    if (typ === "any") return val;
    if (typ === null) {
        if (val === null) return val;
        return invalidValue(typ, val);
    }
    if (typ === false) return invalidValue(typ, val);
    while (typeof typ === "object" && typ.ref !== undefined) {
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
        return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty("arrayItems")    ? transformArray(typ.arrayItems, val)
            : typ.hasOwnProperty("props")         ? transformObject(getProps(typ), typ.additional, val)
            : invalidValue(typ, val);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== "number") return transformDate(val);
    return transformPrimitive(typ, val);
}

function cast(val, typ) {
    return transform(val, typ, jsonToJSProps);
}

function uncast(val, typ) {
    return transform(val, typ, jsToJSONProps);
}

function a(typ) {
    return { arrayItems: typ };
}

function u(...typs) {
    return { unionMembers: typs };
}

function o(props, additional) {
    return { props, additional };
}

function m(additional) {
    return { props: [], additional };
}

function r(name) {
    return { ref: name };
}

const typeMap = {
    "TafModel": o([
        { json: "meta", js: "meta", typ: u(undefined, r("Meta")) },
        { json: "raw", js: "raw", typ: u(undefined, "") },
        { json: "sanitized", js: "sanitized", typ: u(undefined, "") },
        { json: "station", js: "station", typ: u(undefined, "") },
        { json: "time", js: "time", typ: u(undefined, r("EndTime")) },
        { json: "remarks", js: "remarks", typ: u(undefined, "") },
        { json: "forecast", js: "forecast", typ: u(undefined, a(r("Forecast"))) },
        { json: "start_time", js: "start_time", typ: u(undefined, r("EndTime")) },
        { json: "end_time", js: "end_time", typ: u(undefined, r("EndTime")) },
        { json: "max_temp", js: "max_temp", typ: u(undefined, null) },
        { json: "min_temp", js: "min_temp", typ: u(undefined, null) },
        { json: "alts", js: "alts", typ: u(undefined, null) },
        { json: "temps", js: "temps", typ: u(undefined, null) },
        { json: "remarks_info", js: "remarks_info", typ: u(undefined, null) },
        { json: "units", js: "units", typ: u(undefined, r("Units")) },
    ], false),
    "EndTime": o([
        { json: "repr", js: "repr", typ: u(undefined, "") },
        { json: "dt", js: "dt", typ: u(undefined, Date) },
    ], false),
    "Forecast": o([
        { json: "altimeter", js: "altimeter", typ: u(undefined, null) },
        { json: "clouds", js: "clouds", typ: u(undefined, a("any")) },
        { json: "flight_rules", js: "flight_rules", typ: u(undefined, "") },
        { json: "other", js: "other", typ: u(undefined, a("any")) },
        { json: "visibility", js: "visibility", typ: u(undefined, u(r("WindDirection"), null)) },
        { json: "wind_direction", js: "wind_direction", typ: u(undefined, r("WindDirection")) },
        { json: "wind_gust", js: "wind_gust", typ: u(undefined, null) },
        { json: "wind_speed", js: "wind_speed", typ: u(undefined, r("WindDirection")) },
        { json: "wx_codes", js: "wx_codes", typ: u(undefined, a("any")) },
        { json: "end_time", js: "end_time", typ: u(undefined, r("EndTime")) },
        { json: "icing", js: "icing", typ: u(undefined, a("any")) },
        { json: "probability", js: "probability", typ: u(undefined, null) },
        { json: "raw", js: "raw", typ: u(undefined, "") },
        { json: "sanitized", js: "sanitized", typ: u(undefined, "") },
        { json: "start_time", js: "start_time", typ: u(undefined, r("EndTime")) },
        { json: "transition_start", js: "transition_start", typ: u(undefined, u(r("EndTime"), null)) },
        { json: "turbulence", js: "turbulence", typ: u(undefined, a("any")) },
        { json: "type", js: "type", typ: u(undefined, "") },
        { json: "wind_shear", js: "wind_shear", typ: u(undefined, null) },
    ], false),
    "WindDirection": o([
        { json: "repr", js: "repr", typ: u(undefined, "") },
        { json: "value", js: "value", typ: u(undefined, 0) },
        { json: "spoken", js: "spoken", typ: u(undefined, "") },
    ], false),
    "Meta": o([
        { json: "timestamp", js: "timestamp", typ: u(undefined, Date) },
        { json: "stations_updated", js: "stations_updated", typ: u(undefined, Date) },
    ], false),
    "Units": o([
        { json: "accumulation", js: "accumulation", typ: u(undefined, "") },
        { json: "altimeter", js: "altimeter", typ: u(undefined, "") },
        { json: "altitude", js: "altitude", typ: u(undefined, "") },
        { json: "temperature", js: "temperature", typ: u(undefined, "") },
        { json: "visibility", js: "visibility", typ: u(undefined, "") },
        { json: "wind_speed", js: "wind_speed", typ: u(undefined, "") },
    ], false),
};

module.exports = {
    "tafModelToJson": tafModelToJson,
    "toTafModel": toTafModel,
};
