import crypto from "crypto"

function generateToken() {
  return crypto.randomInt(10000, 100000).toString();
}

export default generateToken