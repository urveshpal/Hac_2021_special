const router = require("express").Router();
const hashprovider = require("../Middlewares/Passhash");
const jwt = require("../Middlewares/jwt");
const existingUserDB = require("../Database/verified-user");
const activeUserDB = require("../Database/active-user");
const newlogin = (req, res, next) => {
  /**
   * {
   *  Email: string
   *  Password: string
   * }
   */
  console.log("Login request received", req.body);
  res.locals.loginInfo = req.body;
  next();
};
const findUserinDB = async (req, res, next) => {
  try {
    res.locals.verifieduser = await existingUserDB.FindUser(
      res.locals.loginInfo.email
    );
    console.log("User Verification query successfully executed");
    next();
  } catch (e) {
    console.error("User doesn't exist");
    res
      .status(401)
      .json({ response: "Email or Password wrong", auth_token: null });
  }
};
const comparePassword = async (req, res, next) => {
  try {
    console.log(
      "Login Pass: ",
      res.locals.loginInfo.password,
      "\nDB Pass: ",
      res.locals.verifieduser.user[0].Password
    );
    let result = await hashprovider.Compare(
      res.locals.loginInfo.password,
      res.locals.verifieduser.user[0].Password
    );
    console.log("Password comparison Result: ", result);
    if (result.status === "Password matched") {
      next();
    } else {
      console.error("Password didn't match!");
      res
        .status(401)
        .json({ response: "Email or Password wrong", auth_token: null });
    }
  } catch (e) {
    console.error("Password didn't match! error: ", e);
    res
      .status(401)
      .json({ response: "Email or Password wrong", auth_token: null });
  }
};
const authToken = (email, name, ip) => {
  let token = jwt.Sign(
    { Email: email, Name: name, IP: ip },
    process.env.AUTH_SECRET
  );
  return token;
};
const add2ActiveUser = async (req, res) => {
  let clientIP = req.ip;
  console.log("Client IP address", clientIP);
  let auth = authToken(
    res.locals.verifieduser.user[0].Email,
    res.locals.verifieduser.user[0].Name,
    clientIP
  );
  try {
    let response = await activeUserDB.StartSession({
      IP: clientIP,
      auth_token: auth,
    });
    if (response.status === "Session started for the provided user") {
      console.log("Session started");
      res.status(200).json({
        response: "Session started",
        Token: auth,
        Name: res.locals.verifieduser.user[0].Name,
        Role: res.locals.verifieduser.user[0].Role,
      });
    } else {
      console.error("User is already logged in on the given device", e);
      res.status(403).json({
        response: "User already logged in on the given device",
        auth_token: null,
        Name: null,
        Role: null,
      });
    }
  } catch (e) {
    console.error("Session could not start", e);
    res.status(500).json({
      response: "Session could not start",
      auth_token: null,
      Name: null,
      Role: null,
    });
  }
};
router.post("/", newlogin, findUserinDB, comparePassword, add2ActiveUser);

module.exports = router;
