const db = require('../../config/db');
const DeploymentEngine = require('../../services/deploymentEngine');

exports.getSystemHealth = async (req, res) => {
  try {
    const health = await DeploymentEngine.getSystemHealth();
    res.json({ success: true, data: health });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPerformanceMetrics = async (req, res) => {
  try {
    const metrics = await DeploymentEngine.getPerformanceMetrics();
    res.json({ success: true, data: metrics });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getEnvironmentInfo = async (req, res) => {
  try {
    const env = await DeploymentEngine.getEnvironmentInfo();
    res.json({ success: true, data: env });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStorageInfo = async (req, res) => {
  try {
    const storage = await DeploymentEngine.getStorageInfo();
    res.json({ success: true, data: storage });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
