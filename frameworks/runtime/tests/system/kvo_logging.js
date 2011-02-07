// focuses on log events as those are easy to compare, the other log format is not required be kept stable
// but of course that would be nice.
module("can log kvo actions", {
    setup: function() {
    },
    teardown: function() {
    }
});

var log = SC.KVOLogging;
function run(aClosure) {
    SC.KVOLogging.startLogging();
    SC.run(aClosure);
    SC.KVOLogging.stopLogging();
    equals(SC.KVOLogging.sourceStack.length, 0, "SC.KVOLogging.sourceStack.length");
}


test("kvo logging starts empty", function() {
    equals(0, SC.KVOLogging.logEventsCache.length);
    equals(0, SC.KVOLogging.logMessageCache.length);
});

test("can log initial trigger of property", function() {
    var object = SC.Object.create({
        foo: 0
    });
    run(function() { object.set('foo', 1); });
    equals(1, log.logEventsCache.length);
    same(log.logEventsCache[0], {
        source: null, sourceKey: null,
        target: object, targetKey: 'foo'
    });
});

test("can log property triggering observer", function() {
    var object = SC.Object.create({
        foo: 0,
        fooObserver: function() {}.observes('foo')
    });
    run(function() { object.set('foo', 1); });
    equals(2, log.logEventsCache.length);
    same(log.logEventsCache[0], {
        source: null, sourceKey: null,
        target: object, targetKey: 'foo'
    });
    same(log.logEventsCache[1], {
        source: object, sourceKey: 'foo',
        target: object, targetKey: 'fooObserver'
    });
});

test("can log property triggering binding", function() {
    var object = SC.Object.create({
        foo: 0,
        barBinding: '.foo'
    });

    run(function() { object.set('foo', 1); });
    equals(log.logEventsCache.length, 2);
    same(log.logEventsCache[0], {
        source: null, sourceKey: null,
        target: object, targetKey: 'foo'
    });
    same(log.logEventsCache[1], {
        source: object, sourceKey: 'foo',
        target: object, targetKey: 'bar'
    });
});

test("can log observer triggering property", function() {
    var object = SC.Object.create({
        foo: 0,
        fooObserver: function() { this.set('bar', 1); }.observes('foo'),
        bar: 0
    });
    run(function() { object.set('foo', 1); });
    equals(3, log.logEventsCache.length);
    same(log.logEventsCache[1], {
        source: object, sourceKey: 'foo',
        target: object, targetKey: 'fooObserver'
    });
    same(log.logEventsCache[2], {
        source: object, sourceKey: 'fooObserver',
        target: object, targetKey: 'bar'
    });
});

test("can log property triggering dependent keys", function() {
    var object = SC.Object.create({
        foo: 0,
        bar: function() { return this.get('foo'); }.property('foo')
    });
    run(function() { object.set('foo', 1); });
    equals(2, log.logEventsCache.length);
    same(log.logEventsCache[1], {
        source: object, sourceKey: 'foo',
        target: object, targetKey: 'bar'
    });
});

test("can log multiple properties triggered by dependent keys", function() {
    var object = SC.Object.create({
        foo: 0,
        bar: function() { return this.get('foo'); }.property('foo'),
        baz: function() { return this.get('foo'); }.property('foo')
    });
    run(function() { object.set('foo', 1); });
    equals(3, log.logEventsCache.length);
    same(log.logEventsCache[1], {
        source: object, sourceKey: 'foo',
        target: object, targetKey: 'bar'
    });
    same(log.logEventsCache[2], {
        source: object, sourceKey: 'foo',
        target: object, targetKey: 'baz'
    });
});

test("can log observer triggering two properties", function() {
    var object = SC.Object.create({
        foo: 0,
        fooObserver: function() { this.set('bar', 1).set('baz', 1); }.observes('foo'),
        bar: 0,
        baz: 0
    });
    run(function() { object.set('foo', 1); });
    equals(4, log.logEventsCache.length);
    same(log.logEventsCache[2], {
        source: object, sourceKey: 'fooObserver',
        target: object, targetKey: 'bar'
    });    
    same(log.logEventsCache[3], {
        source: object, sourceKey: 'fooObserver',
        target: object, targetKey: 'baz'
    });    
});

test("can log two independend property sets", function() {
    var object = SC.Object.create({
        foo: 0,
        bar: 0
    });
    run(function() { object.set('foo', 1).set('bar', 1); });
    equals(2, log.logEventsCache.length);
    same(log.logEventsCache[0], {
        source: null, sourceKey: null,
        target: object, targetKey: 'foo'
    });
    same(log.logEventsCache[1], {
        source: null, sourceKey: null,
        target: object, targetKey: 'bar'
    });
});

test("can log observer splitting off two chains", function() {
    var object = SC.Object.create({
        foo: 0,
        fooObserver: function() { this.set('bar', 1).set('baz', 1); }.observes('foo'),
        bar: 0, fooBarBinding: '.bar',
        baz: 0, fooBazBinding: '.baz'
    });
    run(function() { object.set('foo', 1); });
    equals(6, log.logEventsCache.length);
    same(log.logEventsCache[2], {
        source: object, sourceKey: 'fooObserver',
        target: object, targetKey: 'bar'
    });
    same(log.logEventsCache[3], {
        source: object, sourceKey: 'fooObserver',
        target: object, targetKey: 'baz'
    });
    
    same(log.logEventsCache[4], {
        source: object, sourceKey: 'bar',
        target: object, targetKey: 'fooBar'
    });
    same(log.logEventsCache[5], {
        source: object, sourceKey: 'baz',
        target: object, targetKey: 'fooBaz'
    });

});

test("can log observers on two different objects", function() {
    var first = SC.Object.create({
        foo: 0,
        barBinding: '.foo'
    });
    var second = SC.Object.create({
        baz: 0,
        foobarBinding: '.baz'
    });
    run(function() { first.set('foo', 1); second.set('baz', 1); });
    equals(4, log.logEventsCache.length);
    same(log.logEventsCache[0], {
        source: null, sourceKey: null,
        target: first, targetKey: 'foo'
    });
    same(log.logEventsCache[1], {
        source: null, sourceKey: null,
        target: second, targetKey: 'baz'
    });
    same(log.logEventsCache[2], {
        source: first, sourceKey: 'foo',
        target: first, targetKey: 'bar'
    });
    same(log.logEventsCache[3], {
        source: second, sourceKey: 'baz',
        target: second, targetKey: 'foobar'
    });
});

// star observer
// Anonymous?


// test("can log two independent kvo chains", function() {
//     var object = SC.Object.create({
//         a: 0,
//         z: 0,
//         
//         bBinding: '.a',
//         yBinding: '.z',
//         
//         bObserver: function() {}.observes('b'),
//         yObserver: function() {}.observes('y')
//     });
//     run(function() { object.set('foo', 1).set('bar', 1); });
//     equals(2, log.logEventsCache.length);
//     same(log.logEventsCache[0], {
//         source: null, sourceKey: null,
//         target: object, targetKey: 'foo'
//     });
//     same(log.logEventsCache[1], {
//         source: null, sourceKey: null,
//         target: object, targetKey: 'bar'
//     });
// });





// test("restarts testsuite - comment out to prevent testsuite running back to back", function() {
//     setTimeout("location.reload()", 3 * 1000);
// });