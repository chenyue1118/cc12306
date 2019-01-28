const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
let request = require('request');
const allStation = require('./public/js/all-station');
const fs = require('fs');
request = request.defaults({jar: true});

const app = express();

app.use(express.static('./public'));

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.set('views','./view');
app.set('view engine','ejs');

// 初始化页面
app.get('/', (req, res) => {
  res.render('train.ejs');
});

// 获取验证码图片
app.post('/yzmImg', (req, res) => {
  let imgName = new Date().getDate() + Math.random() + '.png';
  request.get({url: 'https://kyfw.12306.cn/passport/captcha/captcha-image?login_site=E&module=login&rand=sjrand&'+Math.random()})
  .on('response',(response) => {})
  .on('end', (err) => {
    if(err) console.log(err);
    res.send({'status': true,'info': imgName,'msg': '获取验证码图片成功'});
  })
  .pipe(fs.createWriteStream('./public/upload/'+imgName));
});

// 登录
app.post('/login', (req, res) => {
  let yzm_data = {
    "answer": req.body.yzm,
    "login_site": "E",
    "rand": "sjrand"
  };
  let option_cap = {
    url: 'https://kyfw.12306.cn/passport/captcha/captcha-check',
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36'
    },
    form: yzm_data
  };
  request(option_cap, (error, response, body) => {
    if(error) console.log(error);
    console.log(response.statusCode);
    console.log(body);
    if(JSON.parse(body).result_code == 4){   //4
      // -------------------------------------------------------------------------------
      getLogin(res, req.body.uname, req.body.upass);
      // -------------------------------------------------------------------------------
    }else{
      // 验证码失败
      res.send({'status': 0,'info': body,'msg': '验证码验证失败！'});
    }
  });
});

//查车次
app.get('/chacheci', (req, res) => {
  let start_city = req.query.start_city;
  let end_city = req.query.end_city;
  let date_time = req.query.date_time;
  let start_city_code = getCityCode(start_city);
  let end_city_code = getCityCode(end_city);
  if(!start_city_code || !end_city_code){
    res.send({'status': false,'info': '','msg': '出发地或目的地错误！'});
    return false;
  }
  let leftTicketData = 'leftTicketDTO.train_date=' + date_time +
                       '&leftTicketDTO.from_station='+ start_city_code +
                       '&leftTicketDTO.to_station=' + end_city_code +
                       '&purpose_codes=ADULT';
  let option_checi = {
    // url	: 'https://kyfw.12306.cn/otn/leftTicket/queryZ?'+ leftTicketData,
    // url : 'https://kyfw.12306.cn/otn/leftTicket/queryO?'+ leftTicketData,
    url	: 'https://kyfw.12306.cn/otn/leftTicket/queryZ?'+ leftTicketData,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36'
    }
  };
  request(option_checi, (error, response, body) => {
    if(error) console.log(error);
    if(response.statusCode == 200 && body.indexOf("true") > 0){
      res.send({'status': true,'info': body,'msg': ''});
    }else{
      res.send({'status': false,'info': '','msg': '数据请求失败！'});
    }
  });
});

// 测试
setInterval(()=> {
  checi()
}, 5000)

const PORT = 9001;
app.listen(PORT, () => {
  console.log(`Server at ${PORT}`);
});



// ============================================================================
// 登录
function getLogin(res,uname,upass) {
  let login_data = {
    "username": uname,
    "password": upass,
    "appid": "otn"
  };
  let option_login = {
    url: 'https://kyfw.12306.cn/passport/web/login',
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36'
    },
    form: login_data
  };
  request(option_login, (error1, response1, body1) => {
    if(error1) console.log(error1);
    console.log(response1.statusCode);
    console.log(body1);
    if(JSON.parse(body1).result_code == 0 && response1.statusCode == 200){
      // -----------------------------------------------------------------------------
      let uamtk = JSON.parse(body1).uamtk;
      let uamtk_data = {
          "appid": "otn"
      };
      let option_uamtk = {
        url: 'https://kyfw.12306.cn/passport/web/auth/uamtk',
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36'
        },
        form: uamtk_data
      };
      request(option_uamtk, (error2, response2, body2) => {
        if(error2) console.log(error2);
        console.log(response2.statusCode);
        console.log(body2);
        if(response2.statusCode == 200 && JSON.parse(body2).result_code == 0){
          let tkString = JSON.parse(body2).newapptk;
          let client_data = {
            "tk": tkString,
            "_json_att": ""
          };
          let option_client = {
            url: 'https://kyfw.12306.cn/otn/uamauthclient',
            method: 'POST',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36'
            },
            form: client_data
          };
          request(option_client, (error3, response3, body3) => {
            if(error3) console.log(error3);
            console.log(response3.statusCode);
            console.log(body3);
            // res.send({'msg': '显示用户名表示登录成功' });
            if(response3.statusCode == 200 && JSON.parse(body3).result_code == 0){
              // 说明登录成功 跳转订票页面
              res.send({'status': 1,'info': body3,'msg': '登录成功！'});
            }else{
              res.send({'status': 0, 'msg': '登录失败'});
            }
          });
        }else{
            res.send({'status': 0, 'msg': '登录失败'});
        }
      });
      // ---------------------------------------------------------------------------
    }else{
      // 用户名或者密码错误
      res.send({'status': 0, 'msg': '用户名或者密码错误！'});
    }
  });
}

function checi() {
  // https://kyfw.12306.cn/otn/leftTicket/queryZ?leftTicketDTO.train_date=2019-01-28&leftTicketDTO.from_station=BJP&leftTicketDTO.to_station=JJG&purpose_codes=ADULT
  let from_station = "BJP";
  let to_station = "JJG";
  let train_date = "2019-02-05";
  let leftTicketData = 'leftTicketDTO.train_date=' + train_date +
                       '&leftTicketDTO.from_station='+ from_station +
                       '&leftTicketDTO.to_station=' + to_station +
                       '&purpose_codes=ADULT';
  let option_checi = {
    // url	: 'https://kyfw.12306.cn/otn/leftTicket/queryZ?'+ leftTicketData,
    // url : 'https://kyfw.12306.cn/otn/leftTicket/queryO?'+ leftTicketData,
    url	: 'https://kyfw.12306.cn/otn/leftTicket/queryZ?'+ leftTicketData,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36'
    }
  };
  request(option_checi, (error, response, body) => {
    if(error) console.log(error);
    if(response.statusCode == 200 && body.indexOf("true") > 0){
      // 1yz83sdJAiXeH7hBHp8Pf7hLN8A5qd74Ilu4LdQcsxfRWc1PPkDT5OdDeqxgtyt81MWRIxNnE8C0%0AYhtn3lHKUFHW7dHiaF35LUrXE7U72X55HIZ%2FcI7UtLIU4uRReidqVpfU67bWfn6RcfBBdEnI29W9%0A7CS4UOkOokPuMYLVoeGDmep4fHt%2FpHl8VrR8KMyZuRfESvE5K1A0uYcxH%2F74ZnrqCrow%2Bc5MJRzn%0AcFWt9638wLHDiSXuQWp2DOc79vVFTC4eQCy98uJjJ8%2FCnA2JWzwhwlYwxyY%2BFgLF8GU5AzjiHG57%0AZSKhUUignZ6PoqlbWkkOFQ%3D%3D|预订|240000Z1330M|Z133|BXP|JGG|BXP|JJG|19:15|06:18|11:03|Y|g0RXF9Purbl1%2F0PwgASJuj5QJv9a0i9cVKv%2FKvmEpgb1OXPFBt1RGL9wNwMCi1qpf831RFOOYn8%3D|20190128|3|P3|01|05|0|0||无||无|||无||1|无|||||1040306010|14361|0|0|null
      let checiResult = JSON.parse(body).data.result;
      checiResult.forEach((item) => {
        let temp = item.split("|");
        // console.log(temp[3]);
        if (temp[3] == "Z71" || temp[3] == "Z133" || temp[3] == "Z65" || temp[3] == "Z67" || temp[3] == "K105") {
          console.log(`${temp[3]}---硬卧-${temp[28]}---软卧-${temp[23]}---硬座-${temp[29]}---二等座-${temp[30]}`);
          // temp[30]  二等座
          // temp[23]  软卧
          // temp[28]  硬卧
          // temp[29]  硬座
          // if ((temp[30] == "有" || temp[30] > 0) || (temp[23] == "有" || temp[23] > 0) || (temp[28] == "有" || temp[28] > 0) || (temp[29] == "有" || temp[29] > 0)) {
          //   console.log(" 抢到票了");
          // }

          if (temp[28] == "有" || temp[28] > 0) {
            // console.log("抢到硬卧票了");
          } else if (temp[23] == "有" || temp[23] > 0) {
            // console.log("抢到软卧票了");
          } else if (temp[30] == "有" || temp[30] > 0) {
            // console.log("抢到二等座票了");
          } else if (temp[29] == "有" || temp[29] > 0) {
            // console.log("抢到硬座票了");
          }
        }
      })
    }else{
      console.log({'status': false,'info': '','msg': '数据请求失败！'});
    }
  });
}

// 下订单
function saveOrder() {

}

// 获取城市的code
function getCityCode(name){
  let code;
  let allStationArr = [];
  for(let i in allStation){
    allStationArr.push(allStation[i]);
  }
  allStationArr.forEach((item) => {
    if(item.name == name){
      code = item.code;
    }
  });
  return code;
}
