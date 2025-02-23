require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const cookieParser = require("cookie-parser");
const path = require("path");
const bcrypt = require("bcrypt"); // 비밀번호 암호화를 위한 bcrypt
const User = require("./models/User"); // 사용자 모델
const app = express();
const port = process.env.PORT || 3000; // 환경 변수에 PORT가 없으면 3000번 사용
const connectDb = require("./config/db");

// DB 연결
connectDb();

// 요청 본문(body)을 JSON 및 URL 인코딩된 형식으로 파싱하기 위한 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 제공 설정
app.use(express.static(path.join(__dirname, "public"))); // 'public' 폴더 내의 정적 파일 제공

// 세션 및 쿠키 설정
app.use(cookieParser());
app.use(
  session({
    secret: "your_secret_key", // 세션 암호화를 위한 비밀 키
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
    }),
  })
);

// 메인 페이지로 main.html 파일 제공
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "main.html"));
});

// 로그인 여부를 클라이언트에 전달하는 API
app.get("/is-logged-in", (req, res) => {
  if (req.session.user) {
    User.findById(req.session.user.id)
      .then((user) => {
        if (user) {
          res.json({ loggedIn: true, name: user.name }); // name 반환
        } else {
          res.json({ loggedIn: false }); // 사용자 없음
        }
      })
      .catch((err) => {
        console.error("Error fetching user info:", err);
        res.json({ loggedIn: false }); // 오류 처리
      });
  } else {
    res.json({ loggedIn: false }); // 로그인되지 않은 경우 false 반환
  }
});

// 사용자 등록 라우트 추가
app.use(require("./routes/register")); // register 라우트 사용

// 각 페이지에 대한 라우트 설정
app.get("/first", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "first.html")); // first.html 파일 응답
});

app.get("/second", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "second.html"));
});

app.get("/third", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "third.html"));
});

app.get("/fourth", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "fourth.html"));
});

app.get("/fifth", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "fifth.html"));
});

app.get("/sixth", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "sixth.html"));
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "register.html"));
});

// 로그인 페이지를 렌더링하는 GET 라우트 추가
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html")); // login.html 파일을 응답
});

// 로그인 처리 라우트
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (user && (await bcrypt.compare(password, user.password))) {
      req.session.user = {
        id: user._id,
        username: user.username,
        name: user.name,
      }; // 세션에 사용자 정보 저장

      res.redirect("/"); // 로그인 성공 후 대시보드로 리다이렉트
    } else {
      res.redirect("/login?error=1"); // 로그인 실패 시 쿼리 파라미터로 실패 상태 전달
    }
  } catch (err) {
    console.error(err);
    res.redirect("/login?error=1"); // 로그인 실패 시 쿼리 파라미터로 실패 상태 전달
  }
});

// MongoDB 데이터 API 추가
// 출도부서별 원인 코드 비율을 계산해 JSON으로 전송하는 라우트 추가
app.get("/api/revised", async (req, res) => {
  try {
    const collectionName = req.query.collection;
    const dbName = req.query.db;
    const data_type = req.query.type;

    if (!collectionName || !dbName) {
      return res
        .status(400)
        .send("컬렉션 이름과 데이터베이스 이름이 필요합니다.");
    }

    const database = mongoose.connection.useDb(dbName);
    const collection = database.collection(collectionName);

    if (data_type === "chart") {
      let data = await collection
        .aggregate([
          { $group: { _id: "$출도부서", count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ])
        .toArray();

      res.json(data);
    } else if (data_type === "table") {
      const allData = await collection.find().toArray();
      // console.log(allData);
      res.json(allData);
    } else if (data_type === "date_chart") {
      // 날짜별로 개정도 현황을 그룹화하여 반환
      let data = await collection
        .aggregate([
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$날짜" } }, // 날짜 필드를 기준으로 그룹화
              count: { $sum: 1 }, // 각 날짜별로 개정도 현황 수를 집계
            },
          },
          { $sort: { _id: 1 } }, // 날짜 오름차순으로 정렬
        ])
        .toArray();

      res.json(data); // 날짜별 데이터 반환
    }
  } catch (error) {
    console.error("Error fetching cause code ratio:", error);
    res.status(500).send("서버 오류");
  }
});

app.get("/api/cause-code-ratio", async (req, res) => {
  try {
    const collectionName = req.query.collection;
    const dbName = req.query.db;
    const urgency = req.query.urgency; // 긴급도 필터
    const importance = req.query.importance; // 중요도 필터

    if (!collectionName || !dbName) {
      return res
        .status(400)
        .send("컬렉션 이름과 데이터베이스 이름이 필요합니다.");
    }

    const database = mongoose.connection.useDb(dbName);
    const collection = database.collection(collectionName);

    let data;

    const query = {
      ...(urgency && { 긴급도: urgency }), // 긴급도 필터 추가
      ...(importance && { 중요도: importance }), // 중요도 필터 추가
    };

    data = await collection.find(query).sort({ _id: 1 }).toArray();

    res.json(data);
  } catch (error) {
    console.error("Error fetching cause code ratio:", error);
    res.status(500).send("서버 오류");
  }
});

app.post("/api/add-entry", async (req, res) => {
  const {
    db,
    collection,
    project,
    dpBomCode,
    workPlan,
    workResult,
    dpBom,
    designFunction,
    drawingType,
    partner,
    responsibilityDepartment,
  } = req.body;

  if (!db || !collection) {
    return res.status(400).json({ message: "DB와 컬렉션을 선택해야 합니다." });
  }

  try {
    const database = mongoose.connection.useDb(db);
    const collectionInstance = database.collection(collection);

    // 유효한 날짜 형식인지 확인하고 변환
    const planDate = workPlan ? new Date(workPlan) : null;
    const resultDate = workResult ? new Date(workResult) : null;

    // 삽입할 문서 생성
    const document = {
      프로젝트: project,
      "D/P&BOM 코드": dpBomCode,
      "D/P&BOM 내역": dpBom,
      설계기능: designFunction,
      도면종류: drawingType,
      협력사: partner,
      직영책임부서: responsibilityDepartment,
      "작업 출도계획": planDate,
      "작업 출도실적": resultDate,
    };

    // MongoDB에 데이터 삽입
    const result = await collectionInstance.insertOne(document);
    res
      .status(200)
      .json({ message: "데이터가 성공적으로 추가되었습니다.", result });
  } catch (error) {
    // 오류 메시지와 전체 에러 객체 출력
    console.error("데이터 삽입 중 오류 발생:", error.message);
    console.error("오류 세부 정보:", error); // 전체 에러 객체 출력
    res.status(500).json({
      message: "데이터 삽입 중 오류가 발생했습니다.",
      error: error.message,
      details: error.stack, // 스택 트레이스 출력
    });
  }
});

app.get("/api/get-filtered-data", async (req, res) => {
  const { dbName, collectionName } = req.query;

  if (!dbName || !collectionName) {
    return res.status(400).json({ message: "DB와 컬렉션을 선택하세요." });
  }

  try {
    const database = mongoose.connection.useDb(dbName);
    const collection = database.collection(collectionName);

    // 구조생설과 의장생설의 출도 계획 필드를 다르게 처리
    const planField =
      dbName === "구조생설" ? "작업 출도계획" : "최종 출도가능일자";

    // 작업 출도실적이 1970-01-01T00:00:00.000+00:00인 데이터만 필터링
    const filteredData = await collection
      .find({
        // "작업 출도실적": { $eq: new Date("1970-01-01T00:00:00.000+00:00") },
        // [planField]: { $exists: false }, // 해당 필드가 없는 데이터만 필터링
      })
      .toArray();

    // 필터링된 데이터를 반환
    res.json(filteredData);
  } catch (error) {
    console.error("데이터 필터링 중 오류 발생:", error);
    res.status(500).json({ message: "데이터 필터링 중 오류가 발생했습니다." });
  }
});

app.get("/api/welding-data", async (req, res) => {
  try {
    const collectionName = req.query.collection || "1월"; // 기본적으로 1월 컬렉션 사용
    const dbName = "용접불량율"; // 용접불량율 데이터베이스 사용
    const filter = req.query.type; // 선종, 업체구분 또는 용접방법 필터를 위한 파라미터

    const database = mongoose.connection.useDb(dbName);
    const collection = database.collection(collectionName);

    if (!filter) {
      return res.status(400).json({ message: "필터를 선택하세요." });
    }

    let weldingData; // 차트용 데이터 (그룹화된 데이터)
    let weldingDataList; // 테이블용 데이터 (그룹화되지 않은 원본 데이터)

    switch (filter) {
      case "COT":
      case "CNT":
      case "LNG":
        // 차트용 데이터 (그룹화)
        weldingData = await collection
          .aggregate([
            { $match: { 선종: filter, 용도판정: "보류" } }, // 선종 필터와 용도판정이 "보류"인 데이터 필터링
            { $group: { _id: "$사유코드 설명", count: { $sum: 1 } } }, // 사유코드 설명으로 그룹화하고 개수 세기
            { $sort: { _id: 1 } },
          ])
          .toArray();

        // 테이블용 데이터 (그룹화되지 않은 전체 데이터)
        weldingDataList = await collection
          .find({ 선종: filter, 용도판정: "보류" }) // 그룹화하지 않고 필터링만 적용
          .sort({ 입력일: 1 }) // 입력일 기준으로 정렬
          .toArray();
        break;

      case "Vendor":
      case "SHI":
        // 차트용 데이터 (그룹화)
        weldingData = await collection
          .aggregate([
            { $match: { 업체구분: filter, 용도판정: "보류" } }, // 업체 필터와 용도판정이 "보류"인 데이터 필터링
            { $group: { _id: "$사유코드 설명", count: { $sum: 1 } } }, // 사유코드 설명으로 그룹화하고 개수 세기
            { $sort: { _id: 1 } },
          ])
          .toArray();

        // 테이블용 데이터 (그룹화되지 않은 전체 데이터)
        weldingDataList = await collection
          .find({ 업체구분: filter, 용도판정: "보류" }) // 그룹화하지 않고 필터링만 적용
          .sort({ 입력일: 1 }) // 입력일 기준으로 정렬
          .toArray();
        break;

      case "EGFC":
      case "EGW":
      case "FAB":
      case "FCAW":
      case "FCSA":
      case "SAW":
        // 차트용 데이터 (그룹화)
        weldingData = await collection
          .aggregate([
            { $match: { 용접방법: filter, 용도판정: "보류" } }, // 용접방법 필터와 용도판정이 "보류"인 데이터 필터링
            { $group: { _id: "$사유코드 설명", count: { $sum: 1 } } }, // 사유코드 설명으로 그룹화하고 개수 세기
            { $sort: { _id: 1 } },
          ])
          .toArray();

        // 테이블용 데이터 (그룹화되지 않은 전체 데이터)
        weldingDataList = await collection
          .find({ 용접방법: filter, 용도판정: "보류" }) // 그룹화하지 않고 필터링만 적용
          .sort({ 입력일: 1 }) // 입력일 기준으로 정렬
          .toArray();
        break;

      default:
        console.log("유효하지 않은 필터입니다.");
        return res.status(400).json({ message: "유효하지 않은 필터입니다." });
    }

    // 성공적으로 데이터를 가져오면 차트 데이터와 테이블 데이터를 응답으로 반환
    res.json({ weldingData, weldingDataList });
  } catch (error) {
    console.error("용접 데이터 가져오는 중 오류 발생:", error);
    res.status(500).json({ message: "서버 오류 발생" });
  }
});

// 로그아웃 라우트
app.get("/logout", (req, res) => {
  res.clearCookie("user_sid"); // 쿠키 삭제
  req.session.destroy((err) => {
    // 세션 파괴
    res.clearCookie("connect.sid"); // 세션 쿠키 삭제
    res.redirect("/"); // 로그아웃 후 메인 페이지로 리다이렉트
  });
});

app.get("/api/department-cause-code", async (req, res) => {
  const department = req.query.department;
  const collectionName = req.query.collection;
  const dbName = req.query.db;
  // console.log(collectionName);
  // console.log(dbName);

  try {
    const database = mongoose.connection.useDb(dbName);
    const collection = database.collection(collectionName);

    const data = await collection
      .aggregate([
        { $match: { 출도부서: department } }, // 부서 이름으로 필터링
        { $group: { _id: "$원인코드", count: { $sum: 1 } } }, // 원인코드로 그룹화하여 개수 카운트
        { $sort: { count: -1 } }, // 큰 순서로 정렬
      ])
      .toArray();

    res.json(data);
  } catch (error) {
    console.error("Error fetching department cause code data:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/api/get-rows", async (req, res) => {
  const shipType = req.query.type; // 선종 필터
  const label = req.query.label; // 사유코드 설명 필터
  const collectionName = req.query.collection || "1월"; // 기본적으로 1월 컬렉션 사용
  const dbName = "용접불량율"; // 데이터베이스 이름

  if (!shipType || !label) {
    return res
      .status(400)
      .json({ message: "선종과 사유코드 설명이 필요합니다." });
  }

  try {
    const database = mongoose.connection.useDb(dbName);
    const collection = database.collection(collectionName);

    // 선종과 사유코드 설명에 맞는 데이터를 필터링
    const rows = await collection
      .find({ 선종: shipType, "사유코드 설명": label })
      .toArray();

    if (rows.length === 0) {
      return res.status(404).json({ message: "해당 데이터가 없습니다." });
    }

    res.json(rows); // 필터링된 데이터를 반환
  } catch (error) {
    console.error("데이터 가져오기 오류:", error);
    res.status(500).json({ message: "서버 오류 발생" });
  }
});

// 사용자 정보 API 수정
app.get("/user-info", (req, res) => {
  if (req.session.user) {
    User.findById(req.session.user.id) // 세션에서 사용자 ID 가져오기
      .then((user) => {
        if (user) {
          // 사용자 정보 응답에 'name' 포함
          res.json({ username: user.username, name: user.name });
        } else {
          res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
        }
      })
      .catch((err) => res.status(500).json({ message: "서버 오류" }));
  } else {
    res.status(401).json({ message: "로그인되지 않았습니다." });
  }
});

app.post("/api/add-collection", async (req, res) => {
  const { dbName, collectionName } = req.body;

  if (!dbName || !collectionName) {
    return res
      .status(400)
      .json({ message: "DB 이름과 컬렉션명이 필요합니다." });
  }

  try {
    // Native MongoDB connection으로 DB 사용
    const database = mongoose.connection.useDb(dbName).db;

    // 기존 컬렉션이 이미 있는지 확인
    const collections = await database.listCollections().toArray();
    const collectionExists = collections.some(
      (col) => col.name === collectionName
    );

    if (collectionExists) {
      return res.status(400).json({ message: "이미 존재하는 컬렉션입니다." });
    }

    // 유효성 검사 규칙 (validator)를 포함한 새로운 컬렉션 생성
    await database.createCollection(collectionName, {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: [
            "프로젝트",
            "D/P&BOM 코드",
            "설계기능",
            "도면종류",
            "작업 출도계획",
          ],
          properties: {
            프로젝트: {
              bsonType: "string",
              description: "프로젝트는 문자열이어야 합니다.",
            },
            "D/P&BOM 코드": {
              bsonType: "string",
              description: "D/P&BOM 코드는 문자열이어야 합니다.",
            },
            설계기능: {
              bsonType: "string",
              description: "설계기능은 문자열이어야 합니다.",
            },
            도면종류: {
              bsonType: "string",
              description: "도면종류는 문자열이어야 합니다.",
            },
            "작업 출도계획": {
              bsonType: "date",
              description: "작업 출도계획은 날짜 형식이어야 합니다.",
            },
            "작업 출도실적": {
              bsonType: ["date", "null"],
              description:
                "작업 출도실적은 날짜 형식이거나 null일 수 있습니다.",
            },
          },
        },
      },
    });

    res.status(200).json({ message: "컬렉션이 성공적으로 추가되었습니다." });
  } catch (error) {
    console.error("컬렉션 추가 중 오류:", error); // 전체 오류 로그 출력
    res.status(500).json({
      message: "컬렉션 추가 중 오류가 발생했습니다.",
      error: error.message,
    });
  }
});

// DB의 컬렉션 목록을 가져오는 API
app.get("/api/get-collections", async (req, res) => {
  const { dbName } = req.query;

  if (!dbName) {
    return res.status(400).json({ message: "DB 이름이 필요합니다." });
  }

  try {
    const database = mongoose.connection.useDb(dbName).db;
    const collections = await database.listCollections().toArray();

    // 타임스탬프가 없는 컬렉션은 제일 위로, 나머지는 이름순으로 정렬
    const sortedCollections = collections.sort((a, b) => {
      return a.name.localeCompare(b.name);
    });

    res.status(200).json(sortedCollections.map((col) => col.name));
  } catch (error) {
    console.error("컬렉션 목록을 불러오는 중 오류:", error);
    res
      .status(500)
      .json({ message: "컬렉션 목록을 불러오는 중 오류가 발생했습니다." });
  }
});

app.get("/api/get-collection-data", async (req, res) => {
  const { dbName, collectionName } = req.query;

  if (!dbName || !collectionName) {
    return res.status(400).json({ message: "DB와 컬렉션 이름이 필요합니다." });
  }

  try {
    const database = mongoose.connection.useDb(dbName);
    const collection = database.collection(collectionName);

    const data = await collection.find({}).toArray(); // 해당 컬렉션의 모든 데이터를 가져옴
    res.json(data); // 데이터를 반환
  } catch (error) {
    console.error("Error fetching collection data:", error);
    res
      .status(500)
      .json({ message: "컬렉션 데이터를 가져오는 중 오류가 발생했습니다." });
  }
});

const { ObjectId } = require("mongoose").Types;

app.put("/api/completion", async (req, res) => {
  const { documentId, completionDate, collectionName, dbName } = req.body;

  console.log("받은 데이터:", req.body);

  // 데이터베이스와 컬렉션 이름이 모두 있어야 함
  if (!dbName || !collectionName) {
    return res.status(400).json({ message: "DB와 컬렉션 이름이 필요합니다." });
  }

  try {
    // 동적으로 데이터베이스 선택
    const database = mongoose.connection.useDb(dbName);
    const collection = database.collection(collectionName);

    // `_id`를 ObjectId로 변환하여 문서 검색
    const updatedRecord = await collection.findOneAndUpdate(
      { _id: new ObjectId(documentId), "작업 출도실적": null }, // 조건
      { $set: { "작업 출도실적": new Date(completionDate) } },
      { new: true }
    );

    if (updatedRecord) {
      res.json({ updatedRecord });
    } else {
      res.status(404).json({
        message: "문서를 찾을 수 없거나 이미 완료 시간이 설정되어 있습니다.",
      });
    }
  } catch (error) {
    console.error("업데이트 중 오류 발생:", error);
    res.status(500).json({
      message: "데이터 업데이트 중 오류가 발생했습니다.",
      error: error.message,
    });
  }
});

// 생산설계 완료 시간 불러오기 API
app.get("/api/completion/:projectId", async (req, res) => {
  const { projectId } = req.params;

  try {
    // 해당 projectId로 데이터베이스에서 완료 데이터 찾기
    const completion = await Completion.findOne({ 프로젝트: projectId });

    if (completion) {
      // 완료 데이터가 있으면 응답
      res.status(200).json(completion);
    } else {
      // 해당 프로젝트 완료 데이터가 없으면 404 Not Found
      res.status(404).json({ message: "완료 데이터를 찾을 수 없습니다." });
    }
  } catch (error) {
    console.error("데이터베이스에서 데이터를 가져오는 중 오류 발생:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

app.delete("/api/delete-collection", async (req, res) => {
  const { dbName, collectionName } = req.body;

  if (!dbName || !collectionName) {
    return res
      .status(400)
      .json({ message: "DB 이름과 컬렉션명이 필요합니다." });
  }

  try {
    const database = mongoose.connection.useDb(dbName).db;
    await database.collection(collectionName).drop(); // 컬렉션 삭제
    res.status(200).json({ message: "컬렉션이 성공적으로 삭제되었습니다." });
  } catch (error) {
    console.error("컬렉션 삭제 중 오류:", error);
    res.status(500).json({
      message: "컬렉션 삭제 중 오류가 발생했습니다.",
      error: error.message,
    });
  }
});

// 서버 시작
app.listen(port, () => {
  console.log(`${port}에서 서버 실행 중...`);
});
