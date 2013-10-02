define([
    'models/eucacollection',
    'models/amazonimage'
], function(EucaCollection, amazonimage) {
    var Amazonimages = EucaCollection.extend({
      model: amazonimage,
      url: '/ec2?Action=DescribeAmazonImages',
    });
    return Amazonimages;
});
