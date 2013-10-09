define([
	'text!./template.html!strip',
    'rivets',
    'visualsearch'
	], function( template, rivets, VS ) {
	return Backbone.View.extend({
		initialize : function(args) {
			this.$el.html(template);
      this.vsearch = VS.init({
          container : this.$el,
          showFacets : true,
          query     : this.model.defaultSearch,
          callbacks : {
              search       : this.model.search,
              facetMatches : this.model.facetMatches,
              valueMatches : this.model.valueMatches
          }
      });

			this.rview = rivets.bind(this.$el, args.model);

      this.listenTo(this.model.records, 'add remove change reset sync', function() {
        this.vsearch.searchBox.searchEvent($.Event('keydown'));
      });
		},
    
		render : function() {
			this.rview.sync();
			return this;
		}
	});
});
