// Isn't able to check bindings triggered from invokeLast as long as invokeLast is used to end the logging
// I try hard not to create any events that could be catched by bindings / observers in this class so you can be sure you only get the output you want
// Might be a little to restrictive in it's output. :/
SC.KVOLogging = SC.Object.create({
    
    // Public interface .........................................
    
    shouldLogText: NO,
    shouldLogDependencies: YES,
    
    logTillEndOfRunloop: function(optionalShouldLogDependencies, optionalShouldLogText) {
        if (undefined !== optionalShouldLogDependencies)
            this.shouldLogDependencies = optionalShouldLogDependencies;
        if (undefined !== optionalShouldLogText)
            this.shouldLogText = optionalShouldLogText;
        
        console.log('logging observers till end of runloop');
        
        this.startLogging();
        this.endLoggingAndOutputAtEndOfRunloop();
    },
    
    // Logging metadata .........................................
    
    startNewPumpRound: function() {
        this.recordText('start new pumping round');
    },
    
    // Logging observers ........................................
    
    KVO_SPACES: '',
    
    // object might be context of observer function instead of originator / receiver
    
    willNotifyObserversForKey: function(object, key) {
        
        this.KVO_SPACES = this.KVO_SPACES + '  ';
        this.recordText('%@%@: notifying observers after change to key "%@"', this.KVO_SPACES, object, key);
        
        // trigger queued keys, already recorded in willNotNotifyObserversBecauseObservingIsDisabled
        if ( ! key)
            return;
        
        this.recordEvent(this.source, this.sourceKey, object, key);
        this.pushSource(object, key);
    },
    
    didNotifyObserversForKey: function(object, key) {
        this.KVO_SPACES = this.KVO_SPACES.slice(0, -2);
        
        // trigger queued keys, already recorded in willNotNotifyObserversBecauseObservingIsDisabled
        if ( ! key)
            return;
        
        this.popSource(object, key);
    },
    
    willFireObserverOnObjectForKey: function(target, key) {
        this.recordText('%@...firing observer on %@ for key "%@"', this.KVO_SPACES, target, key);
        
        if ((/^SC.Binding/).test(this.instanceIdentifierForObject(target)))
            return; // just the observer that triggers the binding - the one after it is the interesting one.
        
        this.recordEvent(this.source, this.sourceKey, target, key);
        this.pushSource(target, key);
    },
    
    didFireObserverOnObjectForKey: function(target, key) {
        if ((/^SC.Binding/).test(this.instanceIdentifierForObject(target)))
            return; // just the observer that triggers the binding - the one after it is the interesting one.
        
        this.popSource(target, key);
    },
    
    willFireLocalObserverForKey: function(object, member, key) {
        this.recordText('%@...firing local observer %@.%@ for key "%@"', this.KVO_SPACES, object, member, key);
        this.recordEvent(this.source, key, object, member);
        this.pushSource(object, member);
    },
    
    didFireLocalObserverForKey: function(object, member, key) {
        this.popSource(object, member);
    },
    
    includingDependendKeysForKey: function(keys, key) {
        this.recordText("%@...including dependent keys for %@: %@", this.KVO_SPACES, key, keys);
        keys.forEach(function(each) {
            this.recordEvent(this.source, this.sourceKey, this.source, each);
        }, this);
    },
    
    didChangeObjectProperty: function(object, key) {
        // already recorded in willNotifyObserversForKey
        if ( ! this.source)
            return;
        
        this.recordEvent(this.source, this.sourceKey, object, key);
    },
    
    firingStarObserverOnObjectForKey: function(target, key) {
        this.recordText('%@...firing * observer on %@ for key "%@"', this.KVO_SPACES, target, key);
    },
    
    willFireDefaultPropertyObserverOnObjectForKey: function(object, key) {
        this.recordText('%@...firing %@.propertyObserver for key "%@"', this.KVO_SPACES, object, key);
    },
    
    willNotNotifyObserversBecauseObservingIsDisabled: function(object, key) {
        this.recordText("%@%@: will not notify observers because observing is suspended", this.KVO_SPACES, object);
        // this.recordEvent(this.source, this.sourceKey, object, key);
    },
    
    // Logging bindings ........................................
    
    triggerChangedBindings: function() {
        this.recordText("Begin: Trigger changed bindings");
    },
    
    endTriggerChangedBindings: function() {
        this.recordText("End: Trigger changed bindings");
    },
    
    // TODO: only record if the binding actually does something (i.e. the value changed)
    setForwardBindingValueToTransformedValue: function(binding, value, transformedValue) {
        this.recordText("%@: %@ -> %@", binding, value, transformedValue);
        this.source = binding._bindingSource;
        this.sourceKey = binding._bindingKey;
        // this.recordEvent(binding._bindingSource, binding._bindingKey, binding._toTarget, binding._toPropertyKey);
    },
    
    setBackwardBindingValueToTransformedValue: function(binding, value, transformedValue) {
        this.recordText("%@: %@ <- %@", binding, value, transformedValue);
        // this.recordEvent(binding._toTarget, binding._toPropertyKey, binding._bindingSource, binding._bindingKey);
    },
    
    // Internal methods .........................................
    
    startLogging: function() {
        SC.LOG_OBSERVERS = SC.LOG_BINDINGS = YES;
        this.logMessageCache = [];
        this.logEventsCache = [];
        this.sourceStack = [];
        this.source = null;
        this.sourceKey = null;
    },
    
    stopLogging: function() {
        SC.LOG_OBSERVERS = SC.LOG_BINDINGS = NO;
    },
    
    endLoggingAndOutputAtEndOfRunloop: function() {
        this.invokeLast(function() {
            this.stopLogging();
            this.logResults();
        });
    },
    
    logMessageCache: [],
    
    recordText: function(format, optionalArguments) {
        this.logMessageCache.push(format.fmt.apply(format, SC.A(arguments).slice(1)));
    },
    
    logEventsCache: [],
    
    recordEvent: function(source, sourceKey, target, targetKey) {
        this.logEventsCache.push({
            source: source,
            sourceKey: sourceKey,
            target: target,
            targetKey: targetKey
        });
    },
    
    sourceStack: [],
    
    pushSource: function(source, sourceKey) {
        this.sourceStack.push({source: this.source, sourceKey: this.sourceKey});
        this.source = source;
        this.sourceKey = sourceKey;
    },
    
    popSource: function(source, sourceKey) {
        var newSource = this.sourceStack.pop();
        this.source = newSource.source;
        this.sourceKey = newSource.sourceKey;
    },
    
    // Log results to console .................................................
    
    logResults: function() {
        if (this.shouldLogText)
            console.log(this.logMessageCache.join('\n'));
        
        if (this.shouldLogDependencies)
            this.logDependencies();
    },
    
    logDependencies: function() {
        this.logDependenciesInTriggerOrder();
        // this.logDependenciesInOccuranceOrder();
    },
    
    logDependenciesInTriggerOrder: function() {
        var roots = this.logEventsCache.filter(function(each) {
            return ! each.source && ! each.sourceKey;
        });
        
        roots.forEach(function(each) {
            console.log(
                this.findDescendantsForEvent(each)
                    .map(this.stringifyEvent, this)
                    .join('\n')
            );
        }, this);
    },
    
    logDependenciesInOccuranceOrder: function() {
        console.log(this.logEventsCache.map(this.stringifyEvent, this).join('\n'));
    },
    
    findDescendantsForEvent: function(start) {
        var parents = [start];
        this.logEventsCache.forEach(function(candidate) {
            if (parents.some(function(parent) {
                return parent.target === candidate.source
                    && parent.targetKey === candidate.sourceKey;
            }))
                parents.push(candidate);
        }, this);
        return parents;
    },
    
    // REFACT: move to KVOEvent?
    stringifyEvent: function(each) {
        return '%@.%@ -> %@.%@'.fmt(
            this.instanceIdentifierForObject(each.source),
            each.sourceKey,
            this.instanceIdentifierForObject(each.target),
            each.targetKey
        );
    },
    
    // REFACT: move to KVOEvent?
    instanceIdentifierForObject: function(object) {
        if ( ! object)
            return 'null';
        
        var klassName = SC._object_className(object.constructor);
        if ('Anonymous' === klassName) {
            if ('_computeBindingTargets' in object)
                klassName = 'SC.Binding'; // stupid SC.Binding
            else if ('isChainObserver' in object)
                klassName = 'SC._ChainObserver';
            else if ('isSet' in object)
                klassName = 'SC.Set';
            else if (jQuery.isArray(object))
                klassName = 'SC.Array';
            else
                console.log('found Anonymous object:', object);
        }
        
        return "%@:%@".fmt(klassName, SC.guidFor(object));
    }

});