const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// @route   GET api/issues
// @desc    Get all issues with optional filters
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  const { status, category, priority, search, my_issues } = req.query;
  let queryText = `
    SELECT i.*, u.full_name as reporter_name, u.email as reporter_email 
    FROM issues i
    LEFT JOIN users u ON i.reporter_id = u.id
    WHERE 1=1
  `;
  const queryParams = [];

  if (my_issues === 'true') {
    queryParams.push(req.user.id);
    queryText += ` AND i.reporter_id = $${queryParams.length}`;
  }

  if (status) {
    queryParams.push(status);
    queryText += ` AND i.status = $${queryParams.length}`;
  }

  if (category) {
    queryParams.push(category);
    queryText += ` AND i.category = $${queryParams.length}`;
  }

  if (priority) {
    queryParams.push(priority);
    queryText += ` AND i.priority = $${queryParams.length}`;
  }

  if (search) {
    queryParams.push(`%${search}%`);
    queryText += ` AND (i.title ILIKE $${queryParams.length} OR i.description ILIKE $${queryParams.length} OR i.address ILIKE $${queryParams.length})`;
  }

  queryText += ` ORDER BY i.created_at DESC`;

  try {
    const result = await db.query(queryText, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error('Fetch issues error:', error);
    res.status(500).json({ message: 'Server error retrieving issues' });
  }
});

// @route   GET api/issues/stats
// @desc    Get metrics and high density problem zones
// @access  Private
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    // 1. Core counters
    const countQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'reported' THEN 1 END) as reported,
        COUNT(CASE WHEN status = 'under_review' THEN 1 END) as under_review,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved
      FROM issues;
    `;
    const countResult = await db.query(countQuery);
    const stats = countResult.rows[0];

    // 2. Counts by category
    const categoryQuery = `
      SELECT category, COUNT(*) as count 
      FROM issues 
      GROUP BY category;
    `;
    const categoryResult = await db.query(categoryQuery);
    const categories = categoryResult.rows;

    // 3. High density problem zones
    // Groups coordinate pairs that are within ~110m (rounding to 3 decimal places)
    const densityQuery = `
      SELECT 
        ROUND(latitude, 3) as lat,
        ROUND(longitude, 3) as lng,
        COUNT(*) as density_count,
        MAX(category) as primary_category,
        MAX(priority) as max_priority,
        ARRAY_AGG(title) as issue_titles
      FROM issues
      GROUP BY ROUND(latitude, 3), ROUND(longitude, 3)
      HAVING COUNT(*) >= 1
      ORDER BY density_count DESC
      LIMIT 10;
    `;
    const densityResult = await db.query(densityQuery);
    const densityZones = densityResult.rows;

    res.json({
      summary: {
        total: parseInt(stats.total, 10),
        reported: parseInt(stats.reported, 10),
        under_review: parseInt(stats.under_review, 10),
        in_progress: parseInt(stats.in_progress, 10),
        resolved: parseInt(stats.resolved, 10)
      },
      categories,
      densityZones
    });
  } catch (error) {
    console.error('Fetch stats error:', error);
    res.status(500).json({ message: 'Server error calculating analytics' });
  }
});

// @route   GET api/issues/:id
// @desc    Get single issue with comments history
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch issue details
    const issueQuery = `
      SELECT i.*, u.full_name as reporter_name, u.email as reporter_email 
      FROM issues i
      LEFT JOIN users u ON i.reporter_id = u.id
      WHERE i.id = $1
    `;
    const issueResult = await db.query(issueQuery, [id]);

    if (issueResult.rows.length === 0) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    const issue = issueResult.rows[0];

    // Fetch comments/timeline
    const commentsQuery = `
      SELECT c.*, u.full_name as author_name, u.role as author_role
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.issue_id = $1
      ORDER BY c.created_at ASC
    `;
    const commentsResult = await db.query(commentsQuery, [id]);

    res.json({
      issue,
      timeline: commentsResult.rows
    });
  } catch (error) {
    console.error('Fetch single issue error:', error);
    res.status(500).json({ message: 'Server error retrieving issue details' });
  }
});

// @route   POST api/issues
// @desc    Create a new civic issue report
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
  const { title, description, category, latitude, longitude, address, image_url } = req.body;

  if (!title || !description || !category || !latitude || !longitude) {
    return res.status(400).json({ message: 'Title, description, category, and geolocation are required' });
  }

  try {
    const result = await db.query(
      `INSERT INTO issues (title, description, category, latitude, longitude, address, reporter_id, image_url, status, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'reported', 'medium')
       RETURNING *`,
      [title, description, category, latitude, longitude, address || 'Unknown Location', req.user.id, image_url || null]
    );

    const newIssue = result.rows[0];

    // Write initial system log comment
    await db.query(
      `INSERT INTO comments (issue_id, user_id, status_changed_to, comment_text)
       VALUES ($1, $2, 'reported', $3)`,
      [newIssue.id, req.user.id, 'Issue reported successfully. Pending administrator review.']
    );

    res.status(201).json(newIssue);
  } catch (error) {
    console.error('Create issue error:', error);
    res.status(500).json({ message: 'Server error submitting issue report' });
  }
});

// @route   PUT api/issues/:id
// @desc    Update issue status or priority (Admin only)
// @access  Private/Admin
router.put('/:id', [authMiddleware, adminMiddleware], async (req, res) => {
  const { id } = req.params;
  const { status, priority, admin_comment } = req.body;

  try {
    // 1. Fetch current status of issue and reporter details
    const checkQuery = `
      SELECT i.*, u.email as reporter_email, u.full_name as reporter_name 
      FROM issues i
      LEFT JOIN users u ON i.reporter_id = u.id
      WHERE i.id = $1
    `;
    const checkResult = await db.query(checkQuery, [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    const currentIssue = checkResult.rows[0];
    const newStatus = status || currentIssue.status;
    const newPriority = priority || currentIssue.priority;

    // 2. Update issue in DB
    const updateQuery = `
      UPDATE issues 
      SET status = $1, priority = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const updateResult = await db.query(updateQuery, [newStatus, newPriority, id]);
    const updatedIssue = updateResult.rows[0];

    // 3. Log the change in comments
    const logComment = admin_comment || `Issue status changed from ${currentIssue.status} to ${newStatus}.`;
    await db.query(
      `INSERT INTO comments (issue_id, user_id, status_changed_to, comment_text)
       VALUES ($1, $2, $3, $4)`,
      [id, req.user.id, newStatus, logComment]
    );

    // 4. Send MOCK email notification if status changed
    if (newStatus !== currentIssue.status && currentIssue.reporter_email) {
      console.log(`
========================================================================
[MOCK EMAIL NOTIFICATION]
To: ${currentIssue.reporter_email} (${currentIssue.reporter_name})
Subject: Status Update: Civic Issue #${id.substring(0, 8)}
Message:
Dear ${currentIssue.full_name || 'Citizen'},

We are writing to inform you that the status of your reported issue "${currentIssue.title}" has been updated.

Previous Status: ${currentIssue.status.toUpperCase()}
New Status: ${newStatus.toUpperCase()}

Administrator Comments:
"${logComment}"

Thank you for helping us keep our community safe and clean.

Best regards,
Civic Issue Management Department
========================================================================
      `);
    }

    res.json(updatedIssue);
  } catch (error) {
    console.error('Update issue error:', error);
    res.status(500).json({ message: 'Server error updating issue details' });
  }
});

// @route   POST api/issues/:id/comments
// @desc    Add comment to an issue
// @access  Private
router.post('/:id/comments', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { comment_text } = req.body;

  if (!comment_text) {
    return res.status(400).json({ message: 'Comment text is required' });
  }

  try {
    // Check if issue exists
    const checkResult = await db.query('SELECT * FROM issues WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    // Insert comment
    const insertQuery = `
      INSERT INTO comments (issue_id, user_id, comment_text)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await db.query(insertQuery, [id, req.user.id, comment_text]);
    
    // Add current user details to return payload
    const newComment = result.rows[0];
    newComment.author_name = req.user.full_name;
    newComment.author_role = req.user.role;

    res.status(201).json(newComment);
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ message: 'Server error posting comment' });
  }
});

module.exports = router;
