// To parse this data:
//
//   const Convert = require("./file");
//
//   const metarModel = Convert.toMetarModel(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
function toMetarModel(json) {
    return cast(JSON.parse(json), r("MetarModel"));
}

function metarModelToJson(value) {
    return JSON.stringify(uncast(value, r("MetarModel")), null, 2);
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
    "MetarModel": o([
        { json: "meta", js: "meta", typ: u(undefined, r("Meta")) },
        { json: "altimeter", js: "altimeter", typ: u(undefined, r("Altimeter")) },
        { json: "clouds", js: "clouds", typ: u(undefined, a("any")) },
        { json: "flight_rules", js: "flight_rules", typ: u(undefined, "") },
        { json: "other", js: "other", typ: u(undefined, a("any")) },
        { json: "visibility", js: "visibility", typ: u(undefined, r("Altimeter")) },
        { json: "wind_direction", js: "wind_direction", typ: u(undefined, r("Altimeter")) },
        { json: "wind_gust", js: "wind_gust", typ: u(undefined, null) },
        { json: "wind_speed", js: "wind_speed", typ: u(undefined, r("Altimeter")) },
        { json: "wx_codes", js: "wx_codes", typ: u(undefined, a("any")) },
        { json: "raw", js: "raw", typ: u(undefined, "") },
        { json: "sanitized", js: "sanitized", typ: u(undefined, "") },
        { json: "station", js: "station", typ: u(undefined, "") },
        { json: "time", js: "time", typ: u(undefined, r("Time")) },
        { json: "remarks", js: "remarks", typ: u(undefined, "") },
        { json: "dewpoint", js: "dewpoint", typ: u(undefined, r("Altimeter")) },
        { json: "relative_humidity", js: "relative_humidity", typ: u(undefined, 3.14) },
        { json: "remarks_info", js: "remarks_info", typ: u(undefined, null) },
        { json: "runway_visibility", js: "runway_visibility", typ: u(undefined, a("any")) },
        { json: "temperature", js: "temperature", typ: u(undefined, r("Altimeter")) },
        { json: "wind_variable_direction", js: "wind_variable_direction", typ: u(undefined, a("any")) },
        { json: "density_altitude", js: "density_altitude", typ: u(undefined, 0) },
        { json: "pressure_altitude", js: "pressure_altitude", typ: u(undefined, 0) },
        { json: "units", js: "units", typ: u(undefined, r("Units")) },
    ], false),
    "Altimeter": o([
        { json: "repr", js: "repr", typ: u(undefined, "") },
        { json: "value", js: "value", typ: u(undefined, u(0, null)) },
        { json: "spoken", js: "spoken", typ: u(undefined, "") },
    ], false),
    "Meta": o([
        { json: "timestamp", js: "timestamp", typ: u(undefined, Date) },
        { json: "stations_updated", js: "stations_updated", typ: u(undefined, Date) },
    ], false),
    "Time": o([
        { json: "repr", js: "repr", typ: u(undefined, "") },
        { json: "dt", js: "dt", typ: u(undefined, Date) },
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
    "metarModelToJson": metarModelToJson,
    "toMetarModel": toMetarModel,
};
