function generateReferralCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';

    for (let i = 0; i < 9; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        code += characters[randomIndex];

        if ((i + 1) % 3 === 0 && i !== 8) {
            code += '-';
        }
    }

    return code;
}

module.exports = { generateReferralCode }; // ✅ Use CommonJS export
