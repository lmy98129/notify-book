const { mysql } = require('../qcloud')

// 登录授权接口
module.exports = async (ctx, next) => {
    // 通过 Koa 中间件进行登录之后
    // 登录信息会被存储到 ctx.state.$wxInfo
    // 具体查看：
    if (ctx.state.$wxInfo.loginState) {
        ctx.state.data = ctx.state.$wxInfo.userinfo

        let openIdCur = ctx.state.data.userinfo.openId,
          avatarUrlCur = ctx.state.data.userinfo.avatarUrl,
          userId;

        await mysql('t_user')
          .where({ open_id: openIdCur })
          .then(row => {
            if (row.length > 0) {
              return Promise.resolve(row[0].id);
            } else {
              let user = {
                open_id: openIdCur,
                register_time: new Date()
              }
              return mysql('t_user').insert(user)
            }
          })
          .then(id => {
            userId = id
            return mysql('t_avatar').where({ user_id: id })
          })
          .then(row => {
            if (row.length === 0) {
              let avatar = {
                user_id: userId,
                img_url: avatarUrlCur,
                create_time: new Date()
              }
              return mysql('t_avatar').insert(avatar)
            } 
            else if (row[0].img_url !== avatarUrlCur) {
              return mysql('t_avatar').update({ img_url: avatarUrlCur }).where({ user_id: userId })
            }
          })
          .catch(err => {
            throw err;
          })

        ctx.state.data['time'] = Math.floor(Date.now() / 1000)
    }
}
