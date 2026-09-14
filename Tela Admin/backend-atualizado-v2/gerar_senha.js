
const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('='.repeat(60));
console.log('GERADOR DE HASH BCRYPT PARA LOGIN');
console.log('='.repeat(60));
console.log('');

rl.question('Digite a senha que você quer criptografar: ', async (senha) => {
    
    if (!senha || senha.trim() === '') {
        console.log('❌ Senha não pode ser vazia!');
        rl.close();
        return;
    }
    
    try {
        console.log('');
        console.log('🔐 Gerando hash bcrypt (aguarde)...');
        console.log('');
        
        const hash = await bcrypt.hash(senha, 10);
        
        console.log('✅ HASH GERADO COM SUCESSO!');
    } catch (error) {
        console.error('❌ Erro ao gerar hash:', error.message);
    }
    
    rl.close();
});