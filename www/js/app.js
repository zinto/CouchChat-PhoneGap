$(function() {
  var config = require('./app/config'),
    home = require("./app/home"),
    thread = require("./app/thread"),
    sync = require('./app/sync'),
    // libraries
    coax = require("coax"),
    touchlink = require("./touchlink"),
    fastclick = require("fastclick"),
    router = require("./routes-element");
    // router = require('director').Router;

  new fastclick.FastClick(document.body);

  var content = $("#content")[0],
    contentRoutes = {
      // "/reload" : home.reload,
      // "/reloaded" : home.reloaded,
      "/" : home.index,
      // "/ready" : home.ready,
      "/threads/new" : thread.create,
      "/thread/:id" : thread.view
    };

  var changesSetup = false;
  function setupChanges(changesHandler) {
    if (changesSetup) return;
    changesSetup = true;
    config.db(function(err, info){
      console.log("setup changes",info);
      config.db.changes({include_docs:true, since:info.update_seq}, function(err, change){
        if (err) {
          console.log(["changes doc err", err]);
        } else {
          // console.log(["chn", change])
          change.doc && changesHandler(change.doc);
        }
      });
    });

  }
  // start the sync
  function appInit(cb) {
    sync.trigger(function(err, user){
      if (err) {
        console.log(["login err", err]);
        return;
      }
      if (user && user.email) {
        config.email = user.email;
        config.db.put("profile:"+user.email, {type : "profile"}, function() {
          cb(false, user.email);
        });
      }
    });
  }

  config.setup(function(err, ok){
    if (err) {
      return console.log(err);
    }
    appInit(function(err, email) {
      var contentRouter = router(contentRoutes, content);
      contentRouter.init();
      setupChanges(function(doc){
        console.log(["dbchange", doc._id, doc.channel_id]);
        if (doc.channel_id == doc._id) {
          // workaround for https://github.com/couchbaselabs/sync_gateway/issues/31
          console.log("resync")
          sync.trigger(function(){});
        }
        config.changesPainter && config.changesPainter();
      });
    });
  });
});