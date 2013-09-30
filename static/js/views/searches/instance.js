define([
  'app',
  'views/searches/generic',
  'views/searches/tagsearch'
], function(app, Search, TagSearch) {
  return function(instances) {
    var config = {
        field: 'instance',
      facets: ['state', 'root_device_name', 'group_name',
        'availability_zone', 'instance_type']
      , localize: {
        root_device_name: app.msg('search_facet_instance_root_device'), //'Root Device',
        group_name: app.msg('search_facet_instance_sgroup'), //'Scaling Group',
        availability_zone: app.msg('search_facet_instance_az'), //'Availability Zone',
        state: app.msg('search_facet_instance_status'), //'Status'
        instance_type: app.msg('search_facet_instance_type')
      }
    };
    var searchConfig = new Search(instances, new TagSearch(config, instances));
    return searchConfig;
  }
});
