const https = require('https');
const { execSync } = require('child_process');

let cachedStatus = {
  lastChecked: null,
  updateAvailable: false,
  latestHash: '',
  latestMessage: '',
  error: null
};

function getCurrentCommitHash() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function checkGitHubUpdate() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/armansyam/Wisuda/commits/main',
      headers: {
        'User-Agent': 'Wisuda-App-Update-Checker',
        'Accept': 'application/vnd.github.v3+json'
      },
      timeout: 5000
    };

    const req = https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const json = JSON.parse(data);
            const latestHash = json.sha ? json.sha.substring(0, 7) : '';
            const currentHash = getCurrentCommitHash();
            const latestMessage = json.commit?.message?.split('\n')[0] || '';

            // Compare standard 7-character commit hashes
            const normLatest = latestHash.substring(0, 7);
            const normCurrent = currentHash.substring(0, 7);
            const updateAvailable = Boolean(normLatest && normCurrent && normLatest !== normCurrent);

            cachedStatus = {
              lastChecked: new Date().toISOString(),
              updateAvailable: updateAvailable,
              latestHash: latestHash,
              currentHash: currentHash,
              latestMessage: latestMessage,
              error: null
            };
          } else {
            cachedStatus.error = `HTTP ${res.statusCode}`;
          }
        } catch (e) {
          cachedStatus.error = e.message;
        }
        resolve(cachedStatus);
      });
    });

    req.on('error', (err) => {
      cachedStatus.error = err.message;
      resolve(cachedStatus);
    });

    req.on('timeout', () => {
      req.destroy();
      cachedStatus.error = 'Timeout';
      resolve(cachedStatus);
    });
  });
}

function getUpdateStatus() {
  const now = Date.now();
  const lastTime = cachedStatus.lastChecked ? new Date(cachedStatus.lastChecked).getTime() : 0;
  // Trigger background check if cache is older than 2 minutes (120,000 ms)
  if (now - lastTime > 120000) {
    checkGitHubUpdate().catch(() => {});
  }
  return cachedStatus;
}

// Initial check on module load
checkGitHubUpdate().catch(() => {});

module.exports = {
  checkGitHubUpdate,
  getUpdateStatus
};
