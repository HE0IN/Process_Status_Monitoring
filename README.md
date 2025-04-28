Node.js 설치하기
Node.js 공식 웹사이트에 접속하여 Windows용 설치 프로그램을 다운로드 후 설치하세요. 이 과정에서 npm도 함께 설치

환경 변수 확인하기
설치 후 PowerShell을 열어 다음 명령어로 버전을 확인해 보세요.

"node -v" OR "npm -v"
만약 npm이 여전히 인식되지 않는다면, Node.js 설치 경로(보통 C:\Program Files\nodejs\)가 환경 변수 PATH에 추가되어 있는지 확인하세요.

npm 명령어 사용
이후 프로젝트 폴더에서
"npm install" AND "npm start"
등의 명령어를 정상적으로 실행

npm start 사용
package.json 파일의 "scripts" 섹션에 "start": "node index.js"처럼 시작 스크립트를 정의해두었다면, 터미널에서 "npm start" 를 실행하면 자동으로 해당 스크립트가 실행

직접 node 명령어로 실행
만약 start 스크립트를 정의하지 않았다면, 실행할 자바스크립트 파일(예: index.js)을 지정하여 "node index.js" 와 같이 직접 실행

'nodemon' is not recognized as an internal or external command, operable program or batch file
이 오류는 nodemon이 시스템에 설치되어 있지 않거나, PATH에서 인식되지 않아서 발생합니다. 이를 해결하는 방법은 두 가지

1. 전역(global) 설치
터미널에서 아래 명령어를 실행하여 nodemon을 전역 설치하세요.

"npm install -g nodemon"
설치 후, nodemon -v로 버전을 확인하고, 다시 npm start를 실행해 보세요.

2. 로컬 설치 및 npx 사용
프로젝트 내에 nodemon을 개발 의존성(dev dependency)으로 설치한 후, npx를 통해 실행할 수도 있습니다.

"npm install --save-dev nodemon"
그런 다음, 아래와 같이 실행할 수 있습니다.

"npx nodemon app.js"
또는 package.json의 start 스크립트가 이미 nodemon app.js로 설정되어 있다면, npm 5.2 이상 버전에서는 자동으로 로컬 bin 폴더를 참조하므로 npm start가 제대로 동작할 수도 있습니다.

두 가지 방법 중 편한 방법을 선택하여 사용

Error: Cannot find module 'dotenv'
dotenv 모듈 설치하기
프로젝트 디렉터리(공정현황모니터링프로젝트)에서 터미널을 열고 아래 명령어를 실행하세요.

"npm install dotenv"
설치 후 재시작, 모듈이 설치되면 다시 npm start를 실행하여 서버를 시작

오류 메시지 querySrv ENOTFOUND _mongodb._tcp.shiwebpj.8n6ly.mongodb.net는 MongoDB 연결을 위해 사용 중인 연결 문자열에 문제가 있음을 나타냅니다.
DNS 조회가 실패했기 때문에 Node.js가 해당 MongoDB 서버를 찾지 못하는 상황
몽고 DB 서버에 들어가서 서버가 정상적으로 열려있는지 확인
네트워크 접근 허용: MongoDB Atlas에서 Network Access > IP Whitelist에 자신의 IP를 추가했는지 확인


1. package.json
package.json은 Node.js 프로젝트의 메타데이터와 의존성 목록을 담고 있는 파일입니다. 이 파일을 통해 프로젝트의 설정과 필요한 패키지를 관리
2. package-lock.json
package-lock.json은 정확한 패키지 버전을 고정해주는 역할을 합니다. npm install을 실행하면 자동으로 생성되며, package.json에 있는 의존성 외에도 하위 패키지(트리 구조)의 정확한 버전을 기록
주요 명령어
의존성 설치: "npm install" → package.json과 package-lock.json을 기반으로 의존성 설치

실제 사용 시 흐름
프로젝트 초기화: "npm init"
→ package.json 생성 (필수 정보 입력)

패키지 설치 및 추가: "npm install express"
→ express 패키지를 설치하고, package.json 및 package-lock.json 업데이트

프로젝트 실행 (스크립트 사용): "npm start"
→ package.json의 "start" 스크립트를 실행 (node app.js)

팀원이 새로운 환경에서 작업 시: "git clone <프로젝트_주소>" + "npm install"
→ package.json과 package-lock.json을 기반으로 동일한 환경이 구성

.env파일
MONGODB_URI=mongodb+srv://<username>:<password>@shiwebpj.8n6ly.mongodb.net/Users?retryWrites=true&w=majority
JWT_SECRET=mycode
