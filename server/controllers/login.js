const { mysql } = require('../qcloud')

// 登录授权接口
module.exports = async (ctx, next) => {
    // 通过 Koa 中间件进行登录之后
    // 登录信息会被存储到 ctx.state.$wxInfo
    // 具体查看：
    if (ctx.state.$wxInfo.loginState) {
        // 从上下文中提取userinfo
        ctx.state.data = ctx.state.$wxInfo.userinfo

        // 从userinfo中提取openId、avatarUrl并初始化userId
        let openIdCur = ctx.state.data.userinfo.openId,
          avatarUrlCur = ctx.state.data.userinfo.avatarUrl,
          userId;

        // 业务流程开始，knex基于promise，用await异步转同步
        // 首先查询t_user表是否有该用户的open-id记录
        await mysql('t_user')
          .where({ open_id: openIdCur })
          .then(row => {
            // 存在相应记录，传出相应的Id
            if (row.length > 0) {
              return Promise.resolve(row[0].id);
            } else {
              // 不存在相应记录，在t_user表插入该记录
              let user = {
                open_id: openIdCur,
                register_time: new Date()
              }
              // 传出相应id
              return mysql('t_user').insert(user)
            }
          })
          .then(id => {
            // 此处接受id备下次使用
            userId = id
            // 查询t_avatar表是否有该用户的头像图片下载地址记录
            return mysql('t_avatar').where({ user_id: id })
          })
          .then(row => {
            // 不存在相应记录，在t_avatar表中插入该记录
            if (row.length === 0) {
              let avatar = {
                user_id: userId,
                img_url: avatarUrlCur,
                create_time: new Date()
              }
              return mysql('t_avatar').insert(avatar)
            } 
            // 存在相应记录，比对是否出现头像图片下载地址的改变，若有则更新
            else if (row[0].img_url !== avatarUrlCur) {
              return mysql('t_avatar').update({ img_url: avatarUrlCur }).where({ user_id: userId })
            }
          })
          .catch(err => {
            // 抛出异常
            throw err;
          })

        ctx.state.data['time'] = Math.floor(Date.now() / 1000)
    }
}
