const express = require("express");
const router = express.Router();
const { query } = require("../config/database");
const verifyToken = require("../middleware/verifyToken");


// ==================================================
// GET CURRENT USER
// ==================================================
router.get("/me", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT id, email, profession, experience
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      user: result.rows[0],
    });

  } catch (error) {
    console.error("GET /me error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});


// ==================================================
// UPDATE PROFESSION & EXPERIENCE
// ==================================================
router.put("/update-profession", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    let { profession, experience } = req.body;

    // Basic validation
    if (!profession || !experience) {
      return res.status(400).json({
        success: false,
        message: "Profession and experience are required",
      });
    }

    // Trim input
    profession = profession.trim();
    experience = experience.trim();

    if (profession.length < 2 || experience.length < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid profession or experience value",
      });
    }

    const result = await query(
      `UPDATE users
       SET profession = $1,
           experience = $2
       WHERE id = $3
       RETURNING id, email, profession, experience`,
      [profession, experience, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      message: "Profile updated successfully",
      user: result.rows[0],
    });

  } catch (error) {
    console.error("UPDATE PROFESSION error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;
