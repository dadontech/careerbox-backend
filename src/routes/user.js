const express = require("express");
const router = express.Router();
const { query } = require("../config/database");
const verifyToken = require("../middleware/verifyToken");

// ==================================================
// GET CURRENT USER (includes all fields)
// ==================================================
router.get("/me", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT id, email, profession, experience,
              profile_picture, location,
              linkedin_url, linkedin_label,
              instagram_url, instagram_label,
              other_url, other_label,
              custom_links
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

const user = result.rows[0];

return res.json({
  success: true,
  user: {
    id: user.id,
    email: user.email,
    profession: user.profession,
    experience: user.experience,
    profilePicture: user.profile_picture,
    location: user.location,
    linkedinUrl: user.linkedin_url,
    linkedinLabel: user.linkedin_label,
    instagramUrl: user.instagram_url,
    instagramLabel: user.instagram_label,
    otherUrl: user.other_url,
    otherLabel: user.other_label,
    customLinks: user.custom_links,
  },
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

// ==================================================
// UPDATE PERSONAL INFORMATION (profile picture, location, links)
// ==================================================
router.put("/personal-info", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      profilePicture,
      location,
      linkedinUrl,
      linkedinLabel,
      instagramUrl,
      instagramLabel,
      otherUrl,
      otherLabel,
      customLinks,
    } = req.body;

    // Validate location (required by frontend)
    if (!location || typeof location !== "string" || location.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Location is required",
      });
    }

    // Prepare customLinks as JSONB (stringify if it's an array)
    const customLinksJson = Array.isArray(customLinks) ? JSON.stringify(customLinks) : '[]';

    const result = await query(
      `UPDATE users
       SET profile_picture = $1,
           location = $2,
           linkedin_url = $3,
           linkedin_label = $4,
           instagram_url = $5,
           instagram_label = $6,
           other_url = $7,
           other_label = $8,
           custom_links = $9
       WHERE id = $10
       RETURNING *`,
      [
        profilePicture || null,
        location.trim(),
        linkedinUrl || null,
        linkedinLabel || null,
        instagramUrl || null,
        instagramLabel || null,
        otherUrl || null,
        otherLabel || null,
        customLinksJson,
        userId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      message: "Personal information updated successfully",
      user: result.rows[0],
    });

  } catch (error) {
    // Log the full error object to see the stack trace
    console.error("UPDATE PERSONAL INFO error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;