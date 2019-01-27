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
  .on('response',(response) => {
    // let rCookie = response.headers['set-cookie'];
    // if(rCookie){
    //   for(let i=0;i<rCookie.length;i++){
    //     cookie[rCookie[i].split(";")[0].split("=")[0]] = rCookie[i].split(";")[0].split("=")[1];
    //   }
    // }
  })
  .on('end', (err) => {
    if(err) console.log(err);
    res.send({'status': true,'info': imgName,'msg': '获取验证码图片成功'});
  })
  .pipe(fs.createWriteStream('./public/upload/'+imgName));
});

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
