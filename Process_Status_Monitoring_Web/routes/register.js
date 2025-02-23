const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/User"); // 사용자 모델 가져오기
const router = express.Router();

// 사용자 등록 라우트
router.post("/register", async (req, res) => {
  const { name, username, password } = req.body; // 요청 본문에서 사용자명과 비밀번호 추출

  try {
    // 사용자명 중복 확인
    const existingUser = await User.findOne({ username: username });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "이미 사용 중인 사용자 이름입니다." });
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10); // 비밀번호를 해싱 (10은 salt 라운드 수)

    // 새로운 사용자 생성
    const newUser = new User({
      name: name,
      username: username,
      password: hashedPassword,
    });

    await newUser.save(); // 데이터베이스에 사용자 저장

    res.status(200).json({ message: "회원가입이 성공적으로 완료되었습니다." }); // 성공 응답
  } catch (err) {
    console.error("회원가입 중 오류 발생:", err);
    res.status(500).json({ message: "서버 오류가 발생했습니다." }); // 서버 오류 응답
  }
});

module.exports = router;
