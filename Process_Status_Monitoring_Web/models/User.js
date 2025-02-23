const mongoose = require("mongoose"); // mongoose 임포트

const userSchema = new mongoose.Schema({
  name: { type: String, required: true }, // 이름 필드 추가
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

module.exports = mongoose.model("User", userSchema);
