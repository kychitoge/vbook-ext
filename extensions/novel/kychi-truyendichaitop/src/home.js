load('config.js');

function execute() {
    return Response.success([
        {
            title: 'Trending',
            input: BASE_URL + '/trending',
            script: 'gen.js'
        },
        {
            title: 'Truyện vừa cập nhật',
            input: BASE_URL + '/truyen-cap-nhat',
            script: 'gen.js'
        },
        {
            title: 'Mới đăng',
            input: BASE_URL + '/tim-kiem?sort=new',
            script: 'gen.js'
        },
        {
            title: 'Xem nhiều',
            input: BASE_URL + '/tim-kiem?sort=view',
            script: 'gen.js'
        },
        {
            title: 'Truyện hay',
            input: BASE_URL + '/tim-kiem?sort=rate',
            script: 'gen.js'
        }
    ]);
}
