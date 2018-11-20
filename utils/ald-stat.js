"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

(function (global, factory) {
  (typeof exports === "undefined" ? "undefined" : _typeof(exports)) === "object" && typeof module !== "undefined" ? module.exports = factory() : typeof define === "function" && define.amd ? define(factory) : global.Ald = factory();
})(undefined, function () {
  if (typeof wx.Queue === "undefined") {
    wx.Queue = new Queue();
    wx.Queue.all();
  }
  // 请求队列
  function Queue() {
    this.concurrency = 4;
    this.queue = [];
    this.tasks = [];
    this.activeCount = 0;
    var _this = this;
    this.push = function (fn) {
      this.tasks.push(new Promise(function (resolve, reject) {
        var task = function task() {
          _this.activeCount++;
          fn().then(function (data) {
            resolve(data);
          }).then(function () {
            _this.next();
          });
        };
        if (_this.activeCount < _this.concurrency) {
          task();
        } else {
          _this.queue.push(task);
        }
      }));
    };
    this.all = function () {
      return Promise.all(this.tasks);
    };
    this.next = function () {
      _this.activeCount--;
      if (_this.queue.length > 0) {
        _this.queue.shift()();
      }
    };
  }
  var config = require("./ald-stat-conf");
  var v = "7.2.0";
  var url = "log";
  //session
  var aldstat_access_token = ""; //appshow -apphide  会话的session
  var aldstat_launch_session = ""; //applaunch  生成的session 可以计算启动次数
  //时间记录
  var aldstat_appShow_time = 0;
  var aldstat_appHide_time = 0;

  //app 变量
  var aldstat_session_key = ""; //user session_key
  var aldstat_openid = ""; //user openid
  var aldstat_user_img = ""; //user img src
  var request_cont = 0; //requrest count
  var aldstat_showoption = ""; //场景值信息
  var aldstat_is_first_open = ""; //是否首次进入
  var aldstat_uuid = get_uuid(); //uuid
  var aldstat_start_time = Date.now(); //启动开始时间
  var aldstat_share_src = ""; //share arguments query ald_share_src
  var aldstat_qr = ""; //二维码参数
  var aldstat_sr = ""; //share  arguments query ald_share_src
  var aldstat_error_count = 0; //error count
  var aldstat_group_info = ""; //share group info
  var aldstat_user_info = ""; //user info
  var sendData = {};
  var aldstat_is_first_page = false;
  var page_use_is_30s_session = false;

  //page 变量
  var page_current = ""; //current page
  var page_up_page = ""; //up page
  var page_options = ""; //page onload arguments
  var aldstat_first_page = "";
  var is_fiist_show = true; // is fist appShow
  var is_share_open_show = false;
  var aldstat_old_scene = "";
  init_app_json();
  //get System Info
  try {
    var res = wx.getSystemInfoSync();
    sendData.br = res.brand;
    sendData.pm = res.model;
    sendData.pr = res.pixelRatio;
    sendData.ww = res.windowWidth;
    sendData.wh = res.windowHeight;
    sendData.lang = res.language;
    sendData.wv = res.version;
    sendData.wvv = res.platform;
    sendData.wsdk = res.SDKVersion;
    sendData.sv = res.system;
  } catch (e) { }
  // this.AldStat.error("get equipment info error ");

  //获取网络状态
  wx.getNetworkType({
    success: function success(res) {
      sendData.nt = res.networkType;
    }
  });
  // 获取精度纬度 地理位置
  wx.getSetting({
    success: function success(res) {
      if (res.authSetting["scope.userLocation"]) {
        //能获取到用户信息
        wx.getLocation({
          type: "wgs84",
          success: function success(res) {
            sendData.lat = res.latitude;
            sendData.lng = res.longitude;
            sendData.spd = res.speed;
          }
        });
      } else {
        if (config.getLocation) {
          wx.getLocation({
            type: "wgs84",
            success: function success(res) {
              sendData.lat = res.latitude;
              sendData.lng = res.longitude;
              sendData.spd = res.speed;
            }
          });
        }
      }
    }
  });
  //自定义事件
  function AldStat(app) {
    this.app = app;
  }
  //自定义事件上报 event:String 上报事件名称 ,content上报参数 Object
  AldStat.prototype["sendEvent"] = function (event, args) {
    if (event !== "" && typeof event === "string" && event.length <= 255) {
      if (typeof args === "string" && args.length <= 255) {
        custom_log("event", event, args);
      } else if ((typeof args === "undefined" ? "undefined" : _typeof(args)) === "object") {
        if (JSON.stringify(args).length >= 255) {
          console.error("自定义事件参数不能超过255个字符");
          return;
        } else if (eventNested(args)) {
          console.error("事件参数，参数内部只支持Number,String等类型，请参考接入文档");
          return;
        }
        custom_log("event", event, JSON.stringify(args));
      } else if (typeof args === "undefined") {
        custom_log("event", event, false);
      } else {
        console.error("事件参数必须为String,Object类型,且参数长度不能超过255个字符");
      }
    } else {
      console.error("事件名称必须为String类型且不能超过255个字符");
    }
  };
  //send session,解密用户信息和群信息
  AldStat.prototype["sendSession"] = function (session) {
    //基本判断
    if (session === "" || !session) {
      console.error("请传入从后台获取的session_key");
      return;
    }
    aldstat_session_key = session;
    var data = listData();
    data.st = Date.now();
    data.tp = "session";
    data.ct = "session";
    data.ev = "event";
    // 查看是否授权，获取用户信息
    if (aldstat_user_info === "") {
      wx.getSetting({
        success: function success(res) {
          if (res.authSetting["scope.userInfo"]) {
            //能获取到用户信息
            // 已经授权，可以直接调用 getUserInfo 获取头像昵称
            wx.getUserInfo({
              success: function success(res) {
                data.ufo = ListUserInfo(res);
                aldstat_user_img = maxLength(res.userInfo.avatarUrl.split("/"));
                if (aldstat_group_info !== "") {
                  data.gid = aldstat_group_info;
                }
                wx_request(data);
              }
            });
          } else {
            //不能获取到用户信息
            if (aldstat_group_info !== "") {
              data.gid = aldstat_group_info;
              wx_request(data);
            }
          }
        }
      });
    } else {
      //当前已经获取到了用户信息
      data.ufo = aldstat_user_info;
      if (aldstat_group_info !== "") {
        //获取群分享信息
        data.gid = aldstat_group_info;
      }
      wx_request(data);
    }
  };
  AldStat.prototype["sendOpenid"] = function (openid) {
    if (openid === "" || !openid) {
      console.error("openID不能为空");
      return;
    }
    aldstat_openid = openid; //要在 http中header中
    var data = listData();
    data.st = Date.now();
    data.tp = "openid";
    data.ev = "event";
    data.ct = "openid";
    wx_request(data);
  };

  //app
  function appOnlaunch(options) {
    aldstat_launch_session = createSession();
    aldstat_showoption = options; //场景值信息复制
    this.aldstat = new AldStat(this); //实例化
    // session_log("app", "launch");
  }

  function appOnShow(options) {
    var is_same_scent;
    if (options.scene == aldstat_old_scene) {
      is_same_scent = false;
    } else {
      is_same_scent = true;
    }
    aldstat_old_scene = options.scene;
    request_cont = 0;
    aldstat_showoption = options;
    aldstat_share_src = options.query.ald_share_src;
    aldstat_qr = options.query.aldsrc || "";
    aldstat_sr = options.query.ald_share_src;
    //show start time
    aldstat_appShow_time = Date.now(); //appShow的时间
    if (!is_fiist_show) {
      //是否是一次执行app_onShow ,用来处理新用户的
      aldstat_is_first_open = false;
    }
    is_fiist_show = false;

    // 1.是否是分享打开，有可能用户在分享的时长超过30S
    if (!is_share_open_show) {
      if (aldstat_appHide_time !== 0 && Date.now() - aldstat_appHide_time > 30000) {
        aldstat_access_token = createSession();
      } else if (is_same_scent) {
        aldstat_access_token = createSession();
      }
    }

    if (aldstat_appHide_time !== 0 && Date.now() - aldstat_appHide_time < 30000) {
      page_use_is_30s_session = true;
    }

    //分享信息上报
    if (options.query.ald_share_src && options.scene == "1044" && options.shareTicket) {
      // get group info
      wx.getShareInfo({
        shareTicket: options.shareTicket,
        success: function success(res) {
          aldstat_group_info = res;
          custom_log("event", "ald_share_click", JSON.stringify(res));
        }
      });
      //其他类型分享
    } else if (options.query.ald_share_src) {
      custom_log("event", "ald_share_click", 1);
    }
    //获取用户信息
    if (aldstat_user_info === "") {
      wx.getSetting({
        withCredentials: true,
        success: function success(res) {
          if (res.authSetting["scope.userInfo"]) {
            var data = sendData;
            wx.getUserInfo({
              withCredentials: true,
              success: function success(res) {
                var data = listData();
                aldstat_user_info = res;
                data.ufo = ListUserInfo(res);
                aldstat_user_img = maxLength(res.userInfo.avatarUrl.split("/"));
                wx_request(data);
              }
            });
          }
        }
      });
    }
    session_log("app", "show");
  }

  function appOnHide() {
    aldstat_appHide_time = Date.now();
    if (aldstat_user_info === "") {
      //当前有用户信息，不用在获取和上报用户信息
      wx.getSetting({
        success: function success(res) {
          if (res.authSetting["scope.userInfo"]) {
            // 已经授权，可以直接调用 getUserInfo 获取头像昵称
            wx.getUserInfo({
              withCredentials: true,
              success: function success(res) {
                aldstat_user_info = res;
                aldstat_user_img = maxLength(res.userInfo.avatarUrl.split("/"));
                var data = listData();
                data.ufo = ListUserInfo(res);
                wx_request(data);
              }
            });
          } else {
            return;
          }
        }
      });
    }
    session_log("app", "hide");
  }

  function appOnError(msg) {
    aldstat_error_count++;
    custom_log("event", "ald_error_message", msg);
  }


  //page
  function pageOnLoad(options) {
    page_options = options;
  }

  function pageOnShow() {
    page_current = this.route;
    page_log("page", "show");
    page_use_is_30s_session = false;
  }

  function pageOnHide() {
    page_up_page = this.route;
  }

  function pageOnUnload() {
    page_up_page = this.route;
  }

  function pageOnPullDownRefresh() {
    custom_log("event", "ald_pulldownrefresh", 1);
  }

  function pageOnReachBottom() {
    custom_log("event", "ald_reachbottom", 1);
  }

  function pageOnShareAppMessage(shareOptions) {
    is_share_open_show = true;
    //分享时，用户填写的path的参数 {id=123} || "
    var pathQuery = filterString(shareOptions.path);
    //场景值的参数
    var optionsQuery = {};
    for (var key in aldstat_showoption.query) {
      if (key === "ald_share_src") {
        optionsQuery[key] = aldstat_showoption.query[key];
      }
    }
    //不带参数的路径
    var path = "";
    shareOptions.path.indexOf("?") == -1 ? path = shareOptions.path + "?" : path = shareOptions.path.substr(0, shareOptions.path.indexOf("?")) + "?";
    //将参数合并在一起
    if (pathQuery !== "") {
      //说明，用户分享的时候带有自己的参数
      for (var key in pathQuery) {
        optionsQuery[key] = pathQuery[key];
      }
    }
    if (optionsQuery.ald_share_src) {
      //分享过
      if (optionsQuery.ald_share_src.indexOf(aldstat_uuid) == -1) {
        //找到自己的UUID
        if (optionsQuery.ald_share_src.length < 200) {
          optionsQuery.ald_share_src = optionsQuery.ald_share_src + "," + aldstat_uuid;
        }
      }
    } else {
      //第一次分享
      optionsQuery.ald_share_src = aldstat_uuid;
    }
    //出来完成参数，拼接
    for (var i in optionsQuery) {
      //只会拼接用户的参数，剔除ald自带的参数，否则外链进入的时候分享会有问题
      if (i.indexOf("ald") == -1) {
        path += i + "=" + optionsQuery[i] + "&";
      }
    }
    shareOptions.path = path + "ald_share_src=" + optionsQuery.ald_share_src;
    custom_log("event", "ald_share_status", shareOptions);
    return shareOptions;
  }

  //Api
  //create uuid
  function createUUID() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + s4() + s4() + s4() + s4() + s4() + s4();
  }

  // get uuid
  function get_uuid() {
    var uuid = "";
    try {
      uuid = wx.getStorageSync("aldstat_uuid");
    } catch (err) {
      uuid = "uuid_getstoragesync";
    }
    //不存在，生成UUID，并且用户是首次进入
    if (!uuid) {
      uuid = createUUID();
      try {
        wx.setStorageSync("aldstat_uuid", uuid);
        aldstat_is_first_open = true;
      } catch (err) {
        wx.setStorageSync("aldstat_uuid", "uuid_getstoragesync");
      }
    } else {
      aldstat_is_first_open = false;
    }
    return uuid;
  }

  // request
  function wx_request(data) {
    request_cont++;
    data.at = aldstat_access_token;
    data.et = Date.now(); //上报时间
    data.uu = aldstat_uuid;
    data.v = v; //版本号
    data.ak = config.app_key.replace(/(\t)|(\s)/g, '');
    data.wsr = aldstat_showoption;
    data.ifo = aldstat_is_first_open;
    data.rq_c = request_cont;
    data.ls = aldstat_launch_session;
    function request() {
      return new Promise(function (resolve, reject) {
        wx.request({
          url: "https://log.aldwx.com/d.html",
          data: data,
          header: {
            AldStat: "MiniApp-Stat",
            se: aldstat_session_key || "", //用户传入的session
            op: aldstat_openid || "", //用户传入的openID
            img: aldstat_user_img //用户img src加密的一坨字符串
          },
          method: "GET",
          success: function success(res) {
            if (res.statusCode == 200) {
              resolve("");
            } else {
              resolve("status error");
            }
          },
          fail: function fail() {
            resolve("fail");
          }
        });
      });
    }

    wx.Queue.push(request);
  }

  function listData() {
    var data = {};
    for (var key in sendData) {
      data[key] = sendData[key];
    }
    return data;
  }

  function maxLength(val) {
    var stringMax = "";
    for (var i = 0; i < val.length; i++) {
      if (val[i].length > stringMax.length) {
        stringMax = val[i];
      }
    }
    return stringMax;
  }

  //生成session方法
  function createSession() {
    return "" + Date.now() + Math.floor(Math.random() * 10000000);
  }

  //剔除不需要的数据，userInfo,groupInfo中的
  function ListUserInfo(ufo) {
    var userInfo = {};
    for (var key in ufo) {
      if (key != "rawData" && key != "errMsg") {
        userInfo[key] = ufo[key];
      }
    }
    return userInfo;
  }

  //出来字符串拼接的参数，格式化成对象
  function filterString(url) {
    if (url.indexOf("?") == -1) return "";
    var result = {};
    var query = url.split("?")[1];
    var queryArr = query.split("&");
    queryArr.forEach(function (item) {
      var value = item.split("=")[1];
      var key = item.split("=")[0];
      result[key] = value;
    });
    return result;
  }
  //自定义事件 检查参数是否是嵌套json
  function eventNested(eventArg) {
    for (var key in eventArg) {
      if (_typeof(eventArg[key]) === 'object' && eventArg[key] !== null) {
        return true;
      }
    }
    return false;
  }

  // 上报封装
  function session_log(ev, life) {
    var data = listData();
    data.ev = ev;
    data.life = life;
    data.ec = aldstat_error_count;
    data.st = Date.now();
    data.dr = Date.now() - aldstat_appShow_time;
    if (aldstat_qr) {
      data.qr = aldstat_qr;
      data.sr = aldstat_qr;
    }
    if (aldstat_share_src) {
      data.usr = aldstat_share_src;
    }
    wx_request(data);
  }
  function page_log(ev, life) {
    var data = listData();
    data.ev = ev;
    data.st = Date.now();
    data.life = life;
    data.pp = page_current;
    data.pc = page_up_page;
    data.dr = Date.now() - aldstat_appShow_time; //兼容老版本算法
    if (is_share_open_show) {
      data.so = 1;
    }
    is_share_open_show = false;
    if (page_options && JSON.stringify(page_options) != "{}") {
      data.ag = page_options;
    }
    if (aldstat_qr) {
      data.qr = aldstat_qr;
      data.sr = aldstat_qr;
    }
    if (aldstat_share_src) {
      data.usr = aldstat_share_src;
    }
    if (page_use_is_30s_session) {
      data.ps = 1;
    }
    if (!aldstat_is_first_page) {
      aldstat_first_page = page_current;
      aldstat_is_first_page = true;
      data.ifp = aldstat_is_first_page;
      data.fp = page_current;
    }
    wx_request(data);
  }
  function custom_log(ev, type, content) {
    var data = listData();
    data.ev = ev;
    data.tp = type;
    data.st = aldstat_start_time;
    data.dr = Date.now() - aldstat_appShow_time;
    if (content) data.ct = content;
    wx_request(data);
  }
  //init
  function init_app_json() {
    wx.request({
      "url": "https://log.aldwx.com/config/app.json",
      "header": {
        "AldStat": "MiniApp-Stat"
      },
      "method": "GET",
      "success": function success(res) {
        if (res.statusCode === 200) {
          if (v < res.data.version) {
            console.warn("您的SDK不是最新版本，请尽快升级！");
          }
          if (res.data.warn) {
            console.warn(res.data.warn);
          }
          if (res.data.error) {
            console.error(res.data.error);
          }
        }
      }
    });
  }

  //-- 老版本-------------------------------------------------------------------------------------------------------------
  function hookIt(obj, method, hookFunc) {
    if (obj[method]) {
      var oldMethod = obj[method];
      obj[method] = function (arg) {
        hookFunc.call(this, arg, method);
        oldMethod.call(this, arg);
      };
    } else {
      obj[method] = function (arg) {
        hookFunc.call(this, arg, method);
      };
    }
  }

  var oldApp = function oldApp(arg) {
    (function () {
      var _oldApp = App;
      var _oldPage = Page;
      var _oldComponent = Component;
      App = function App(arg) {
        hookIt(arg, "onLaunch", appOnlaunch);
        hookIt(arg, "onShow", appOnShow);
        hookIt(arg, "onHide", appOnHide);
        hookIt(arg, "onError", appOnError);
        _oldApp(arg);
      };

      Page = function Page(arg) {
        var c = arg.onShareAppMessage;
        hookIt(arg, "onLoad", pageOnLoad);
        hookIt(arg, "onUnload", pageOnUnload);
        hookIt(arg, "onShow", pageOnShow);
        hookIt(arg, "onHide", pageOnHide);
        hookIt(arg, "onReachBottom", pageOnReachBottom);
        hookIt(arg, "onPullDownRefresh", pageOnPullDownRefresh);
        if (typeof c !== "undefined" && c !== null) {
          arg.onShareAppMessage = function (val) {
            if (typeof c !== "undefined") {
              var share = c.call(this, val);
              if (typeof share === "undefined") {
                share = {};
                share.path = this.route;
              } else if (typeof share.path === "undefined") {
                share.path = this.route;
              }
              return pageOnShareAppMessage(share);
            }
          };
        }
        _oldPage(arg);
      };
      Component = function Component(arg) {
        console.log(arg, 'Component arg')

        var c = arg.methods.onShareAppMessage;
        hookIt(arg.methods, "onLoad", pageOnLoad);
        hookIt(arg.methods, "onUnload", pageOnUnload);
        hookIt(arg.methods, "onShow", pageOnShow);
        hookIt(arg.methods, "onHide", pageOnHide);
        hookIt(arg.methods, "onReachBottom", pageOnReachBottom);
        hookIt(arg.methods, "onPullDownRefresh", pageOnPullDownRefresh);
        if (typeof c !== "undefined" && c !== null) {
          arg.methods.onShareAppMessage = function (val) {
            if (typeof c !== "undefined") {
              var share = c.call(this, val);
              if (typeof share === "undefined") {
                share = {};
                share.path = this.route;
              } else if (typeof share.path === "undefined") {
                share.path = this.route;
              }
              return pageOnShareAppMessage(share);
            }
          };
        }
        _oldComponent(arg);
      };
    })();
  };

  // App 周期钩子
  function aldApp(arg) {
    var appListFn = {};
    for (var key in arg) {
      if (key !== "onLaunch" && key !== "onShow" && key !== "onHide" && key !== "onError" && key !== "onPageNotFound" && key !== "onUnlaunch") {
        appListFn[key] = arg[key];
      }
    }
    appListFn.onLaunch = function (options) {

      appOnlaunch.call(this, options);
      if (typeof arg.onLaunch === "function") {
        arg.onLaunch.call(this, options);
      }
    };
    // App onShow 周期
    appListFn.onShow = function (options) {
      appOnShow.call(this, options);
      if (arg.onShow && typeof arg.onShow === "function") {
        arg.onShow.call(this, options);
      }
    };
    appListFn.onHide = function () {
      appOnHide.call(this);
      if (arg.onHide && typeof arg.onHide === "function") {
        arg.onHide.call(this);
      }
    };
    appListFn.onError = function (msg) {
      appOnError.call(this, msg);
      if (arg.onError && typeof arg.onError === "function") {
        arg.onError.call(this, msg);
      }
    };
    appListFn.onUnlaunch = function () {
      if (arg.onUnlaunch && typeof arg.onUnlaunch === "function") {
        arg.onUnlaunch.call(this);
      }
    };
    appListFn.onPageNotFound = function (fn) {
      if (arg.onPageNotFound && typeof arg.onPageNotFound === "function") {
        arg.onPageNotFound.call(this, fn);
      }
    };
    App(appListFn);
  }

  //Page 周期钩子
  function aldPage(arg) {
    var pageListFn = {};
    for (var key in arg) {
      if (key !== "onLoad" && key !== "onReady" && key !== "onShow" && key !== "onHide" && key !== "onUnload" && key !== "onPullDownRefresh" && key !== "onReachBottom" && key !== "onShareAppMessage" && key !== "onPageScroll" && key !== "onTabItemTap") {
        pageListFn[key] = arg[key];
      }
    }
    pageListFn.onLoad = function (options) {
      pageOnLoad.call(this, options);
      if (typeof arg.onLoad === "function") {
        arg.onLoad.call(this, options);
      }
    };
    pageListFn.onShow = function (t) {
      pageOnShow.call(this);
      if (typeof arg.onShow === "function") {
        arg.onShow.call(this, t);
      }
    };
    pageListFn.onHide = function (t) {
      pageOnHide.call(this);
      if (typeof arg.onHide === "function") {
        arg.onHide.call(this, t);
      }
    };
    pageListFn.onUnload = function (t) {
      pageOnUnload.call(this);
      if (typeof arg.onUnload === "function") {
        arg.onUnload.call(this, t);
      }
    };
    pageListFn.onReady = function (t) {
      if (arg.onReady && typeof arg.onReady === "function") {
        arg.onReady.call(this, t);
      }
    };
    pageListFn.onReachBottom = function (t) {
      pageOnReachBottom();
      if (arg.onReachBottom && typeof arg.onReachBottom === "function") {
        arg.onReachBottom.call(this, t);
      }
    };
    pageListFn.onPullDownRefresh = function (t) {
      pageOnPullDownRefresh();
      if (arg.onPullDownRefresh && typeof arg.onPullDownRefresh === "function") {
        arg.onPullDownRefresh.call(this, t);
      }
    };
    pageListFn.onPageScroll = function (t) {
      if (arg.onPageScroll && typeof arg.onPageScroll === "function") {
        arg.onPageScroll.call(this, t);
      }
    };
    pageListFn.onTabItemTap = function (t) {
      if (arg.onTabItemTap && typeof arg.onTabItemTap === "function") {
        arg.onTabItemTap.call(this, t);
      }
    };
    if (arg.onShareAppMessage && typeof arg.onShareAppMessage === "function") {
      pageListFn.onShareAppMessage = function (res) {
        var share_msg = arg.onShareAppMessage.call(this, res);
        if (typeof share_msg == "undefined") {
          share_msg = {};
          share_msg.path = this.route;
        } else {
          if (typeof share_msg.path == "undefined") {
            share_msg.path = this.route;
          }
        }
        return pageOnShareAppMessage.call(this, share_msg);
      };
    }
    Page(pageListFn);
  }
  if (config.plugin) {
    return {
      App: aldApp,
      Page: aldPage
    };
  } else {
    return oldApp();
  }
});
