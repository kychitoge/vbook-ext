load('config.js');
function execute() {
    return Response.success([
        { title: '⚠️ Lưu ý',          input: 'notice',                                            script: 'gen.js' },
        { title: 'Truyện Hot',        input: BASE_URL + '/the-loai/tat-ca/truyen-hot.html',       script: 'gen.js' },
        { title: 'Truyện Full',       input: BASE_URL + '/the-loai/tat-ca/truyen-full.html',      script: 'gen.js' },
        { title: 'Truyện VIP',        input: BASE_URL + '/the-loai/tat-ca/vip.html',              script: 'gen.js' }
        
    ]);
}
