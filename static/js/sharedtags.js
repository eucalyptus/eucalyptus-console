define([
	'models/tags',
  'models/astags',
], 
function(Tags, ASTags) {
  var tags = new Tags();
  var astags = new ASTags();
  astags.on('sync add change reset remove', function() {
    tags.add( astags.models );
  });

	tags.fetch({merge: true, add: true, remove: true});
	astags.fetch({merge: true, add: true, remove: true});
	return tags;
});
