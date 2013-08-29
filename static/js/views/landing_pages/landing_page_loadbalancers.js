define([
    './landing_page_base',
    'backbone',
    'rivets',
    'text!./landing_page_loadbalancers.html!strip'
], function (LandingPage, Backbone, rivets, template) {
    return LandingPage.extend({
        initialize: function (args) {
            this.template = template;
            this.scope = new Backbone.Model({
                id: args.id,
                collection: args.collection,
                expanded_row_callback: function (e) {
                    var thisID = e.item.get('id');
                    var $placeholder = $('<div>').attr('id', "expanded-" + thisID).addClass("expanded-row-inner-wrapper");
                    if (e.item.get('expanded') === true) {
                        // IF EXPANDED, APPEND THE RENDER EXPANDED ROW VIEW TO THE PREVIOUS PLACEHOLDER, MATCHED BY ITEM'S ID
                        require(['app', 'views/expandos/loadbalancers'], function (app, expando) {
                            var $el = $('<div>'),
                                expandedElem = $('#expanded-' + thisID);
                            new expando({el: $el, model: app.data.loadbalancers.where({id: thisID})[0] });
                            expandedElem.children().remove();
                            expandedElem.append($el);
                        });
                    }
                    // IF NOT EXPANDED, RETURN THE PLACEHOLDER DIV
                    return $('<div>').append($placeholder).html();
                },
                get_html_class_status: function (e) {
                    return "table-row-status status-" + e.item.get('status');
                }
            });
            this._do_init();
        }
    });
});

