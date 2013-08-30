define([
  '../../../models/loadbalancer'
], function(loadbalancer) {
  return loadbalancer.extend({
    // setup any additional things here
    clear: function() {
      set('name', undefined);
    }
  });
});
