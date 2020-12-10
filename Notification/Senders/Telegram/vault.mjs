import vault from "node-vault";
var options = {
    apiVersion: 'v1', // default
    endpoint: 'http://192.168.31.174:8200'
  };

  const mountPoint = 'userpass';
const username = 'reksar2012';
const password = '401029276s';

async function Init(){
  let vaultRes = vault(options);
  let res = await vaultRes.userpassLogin({ username, password });
  vaultRes = vault({
    apiVersion: 'v1', // default
    endpoint: 'http://192.168.31.174:8200',
    token: res.auth.client_token
  });
  return vaultRes;
};
let Vault = await Init();
export default Vault;