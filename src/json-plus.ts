"use static";

/**
 * JSON Plus
 * @author Joseph Lenton
 * 
 * This is an alternative JSON parsing library,
 * which aims to offer filters, and recursion.
 * 
 * It's mostly used for dumping data up to the
 * server, which you then want to dump back
 * down to the client later.
 * 
 * Note that if you just want regular JSON,
 * use the standard JSON functions. This only
 * exists because they don't offer what I need.
 */
module JSONPlus {
    export interface FilterMap {
        [name: string]: (obj:any) => any;
    }

    interface ObjectMap {
        [obj: string]: number;
    }

    interface IndexCounter {
        index: number;
    }
   
    var OBJECT_CONSTRUCTOR = ((Object) ({ })).constructor;

    /**
     * If a filter is in the filter map,
     * of the type given, then the filter
     * is applied to the object,
     * and the result is returned.
     * 
     * Otherwise this returns the object given.
     * 
     * @param obj The object to apply the filter to.
     * @param type The type of the object, for checking inside filters.
     * @param filters An object map of type names to filter functions.
     */
    var applyFilter = function(obj:any, type:string, filters:FilterMap) : bool {
        if (filters !== undefined) {
            var filter = filters[type];

            if (filter !== undefined) {
                return filter(obj);
            } else {
                return obj;
            }
        } else {
            return obj;
        }
    }

    var getType = function(obj: any): string {
        if (obj === true || obj === false) {
            return 'boolean';
        } else if (obj === null) {
            return 'null';
        } else if (obj === undefined) {
            return 'undefined';
        } else if ( typeof obj === 'number' || (obj instanceof Number) ) {
            return 'number';
        } else if ( typeof obj === 'string' || (obj instanceof String) ) {
            return 'string';
        } else if (obj instanceof Array) {
            return 'array';
        } else if (obj.constructor === OBJECT_CONSTRUCTOR) {
            return 'object';
        } else {
            var strConstructor = obj.constructor.toString();
            var funcNameRegex = /function ([a-zA-Z0-9_]{1,})\(/;
            var results = funcNameRegex.exec(strConstructor);

            if (results && results.length > 1) {
                return results[1].toLowerCase();
            } else {
                return null;
            }
        }
    }

    /**
     * Primitives include numbers, null, undefined,
     * string, NaN, and Inifinity.
     * 
     * @param obj The object to test.
     * @param type The previously known 'typeof' of the object.
     * @return True if the object is a string, number, null or undefined.
     */
    var isPrimitive = function(obj:any, type:string) : bool {
        return  obj === undefined       ||
                obj === null            ||
                obj === true            ||
                obj === false           ||
                type === 'string'       ||
                type === 'number'       ||
                (obj instanceof String) ||
                (obj instanceof Number);
    }

    var form: { (obj: any, objects: any[], types: string[], filter: FilterMap, seen:ObjectMap, indexCount:IndexCounter) : any; } =
            function(obj: any, objects: any[], types: string[], filters: FilterMap, seen:ObjectMap, indexCount:IndexCounter): any {
                var cached = seen[obj];

                if (cached !== undefined) {
                    return cached;
                } else {
                    var index = indexCount.index++;
                    seen[obj] = index;

                    var type = getType(obj);
                    obj = applyFilter(obj, type, filters);
                    types[index] = type;

                    if (isPrimitive(obj, type)) {
                        return index;
                    } else {
                        var newObj:Object = {};

                        for (var k in obj) {
                            if (obj.hasOwnProperty(k)) {
                                newObj[k] = form(obj[k], objects, types, filters, seen, indexCount);
                            }
                        }

                        return newObj;
                    }
                }
            }

    var reform: { (data: any, objects: any[], types: string[], filter: FilterMap, seen: any[]) : any; } =
            function(data:any, objects:any[], types:string[], filters:FilterMap, seen:any[]) : any {
                if (typeof data === 'number') {
                    var cachedData = seen[data];

                    if (cachedData !== undefined) {
                        return cachedData;
                    } else {
                        var trueData = objects[data],
                            type:string = types[data];

                        trueData = applyFilter(trueData, type, filters);
                        seen[data] = trueData;

                        return trueData;
                    }
                } else {
                    for (var k in data) {
                        if (data.hasOwnProperty(k)) {
                            data[k] = reform(data[k], objects, types, filters, seen);
                        }
                    }
                }
            }

    export function parse(src:string, filters:FilterMap) : any {
        var data = JSON.parse(src);

        var objects   = data.objects,
            types     = data.types,
            structure = data.structure,
            seen      = [];

        if (
                !data.is_json_plus &&
                !(objects instanceof Array) &&
                !(types   instanceof Array)
        ) {
            throw new Error("Illegal JSON Plus format given (probably just regular JSON)");
        } else {
            return reform(data, objects, types, filters, seen);
        }
    }

    export function stringify(object:any, filters:FilterMap) : string {
        var types: string[] = [],
            objects: any[] = [],
            seen: ObjectMap = {},
            indexCounter:IndexCounter = { index: 0 };

        var structure:any = form(object, types, objects, filters, seen, indexCounter);

        return JSON.stringify({
                is_json_plus: true,
                types: types,
                objects:objects,
                structure:structure
        });
    }

    export function serialize(object: any, filters: FilterMap): string {
        return stringify(object, filters);
    }
}
