var old = alert;

alert = function() {
      console.log(new Error().stack);
      old.apply(window, arguments);
};

function requireCSS(url) {
    var link = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = url;
    document.getElementsByTagName("head")[0].appendChild(link);
}

require.config({
        waitSeconds: 20,
        baseUrl: '../js',
        paths: {
		'underscore': '../lib/underscore-1.4.3',
		'backbone': '../lib/backbone-1.0',
		'backbone-validation': '../lib/backbone-validation',
        'visualsearch' : '../lib/visualsearch',
        'rivets' : '../lib/rivets',
        'rivetsbase' : '../lib/rivetsbase',
        'text' : '../lib/text',
        'order' : '../lib/order',
        'domReady' : '../lib/domReady',
        'jasmine': '../lib/test/jasmine',
        'jasmine-html': '../lib/test/jasmine-html',
        },
        shim: {
                underscore : {
                       exports: '_',
                },
                visualsearch: {
                    exports: 'VS'
                },
                backbone : {
                    deps: ['underscore'],
                	exports: 'Backbone',
                },
                'backbone-validation' : {
                    deps: ['backbone'],
                	exports: 'Backbone.Validation',
                },
                rivetsbase : {
                	exports: 'rivets',
                },
                rivets : {
                        deps: ['rivetsbase'],
                        exports: 'rivets'
                },
                jasmine: {
                    deps: ['underscore'],
                    exports: 'jasmine'
                },
                'jasmine-html': {
                    deps: ['jasmine'],
                    exports: 'jasmine'
                }
	}
});

require(['underscore', 'backbone', 'backbone-validation'], function(_, Backbone) {
    _.extend(Backbone.Model.prototype, Backbone.Validation.mixin);
});

var oldClean = jQuery.cleanData;

$.cleanData = function( elems ) {
    for ( var i = 0, elem;
    (elem = elems[i]) !== undefined; i++ ) {
        //console.log('cleandata', elem);
        $(elem).triggerHandler("destroyed");
    }
    oldClean.apply(this, arguments);
};

if (localStorage.getItem('__DO_JASMINE_TESTS__')) {
    require(['lib/test/main.js'], function(jasmineEnv) {
        console.log('JASMINE', jasmineEnv);
    });
}
