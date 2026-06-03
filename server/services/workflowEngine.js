const db = require('../config/db');

class WorkflowEngine {
  static async getWorkflowDefinitions(companyId, filters = {}) {
    try {
      let sql = `SELECT * FROM workflow_definitions WHERE company_id = $1`;
      const params = [companyId];
      let paramIndex = 2;

      if (filters.category) {
        sql += ` AND category = $${paramIndex++}`;
        params.push(filters.category);
      }
      if (filters.is_active !== undefined) {
        sql += ` AND is_active = $${paramIndex++}`;
        params.push(filters.is_active);
      }

      sql += ` ORDER BY created_at DESC`;

      if (filters.limit) {
        sql += ` LIMIT $${paramIndex++}`;
        params.push(filters.limit);
      } else {
        sql += ` LIMIT 50`;
      }
      if (filters.offset) {
        sql += ` OFFSET $${paramIndex++}`;
        params.push(filters.offset);
      }

      const result = await db.query(sql, params);
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getWorkflowDefinitionById(id) {
    try {
      const result = await db.query(
        `SELECT * FROM workflow_definitions WHERE id = $1`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Workflow not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async createWorkflowDefinition(data) {
    try {
      const result = await db.query(
        `INSERT INTO workflow_definitions (company_id, name, description, category, trigger_type, trigger_config, steps, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          data.company_id,
          data.name,
          data.description || null,
          data.category || 'general',
          data.trigger_type || 'manual',
          data.trigger_config ? JSON.stringify(data.trigger_config) : null,
          JSON.stringify(data.steps),
          data.created_by || null,
        ]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async updateWorkflowDefinition(id, data) {
    try {
      const fields = [];
      const params = [];
      let paramIndex = 1;

      if (data.name !== undefined) { fields.push(`name = $${paramIndex++}`); params.push(data.name); }
      if (data.description !== undefined) { fields.push(`description = $${paramIndex++}`); params.push(data.description); }
      if (data.category !== undefined) { fields.push(`category = $${paramIndex++}`); params.push(data.category); }
      if (data.trigger_type !== undefined) { fields.push(`trigger_type = $${paramIndex++}`); params.push(data.trigger_type); }
      if (data.trigger_config !== undefined) { fields.push(`trigger_config = $${paramIndex++}`); params.push(JSON.stringify(data.trigger_config)); }
      if (data.steps !== undefined) { fields.push(`steps = $${paramIndex++}`); params.push(JSON.stringify(data.steps)); }
      if (data.is_active !== undefined) { fields.push(`is_active = $${paramIndex++}`); params.push(data.is_active); }

      if (fields.length === 0) return { success: false, error: 'No fields to update' };

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(id);

      const result = await db.query(
        `UPDATE workflow_definitions SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        params
      );
      if (result.rows.length === 0) return { success: false, error: 'Workflow not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async deleteWorkflowDefinition(id) {
    try {
      const result = await db.query(
        `DELETE FROM workflow_definitions WHERE id = $1 RETURNING id`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Workflow not found' };
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async triggerWorkflow(workflowId, referenceType, referenceId, initiatedBy) {
    try {
      const workflow = await db.query(
        `SELECT * FROM workflow_definitions WHERE id = $1 AND is_active = true`,
        [workflowId]
      );
      if (workflow.rows.length === 0) return { success: false, error: 'Active workflow not found' };

      const definition = workflow.rows[0];
      const steps = typeof definition.steps === 'string' ? JSON.parse(definition.steps) : definition.steps;
      const firstStep = steps[0] || {};

      const stepsData = steps.map((step, index) => ({
        step_index: index,
        step_name: step.name || `Step ${index + 1}`,
        status: index === 0 ? (step.approvers && step.approvers.length > 0 ? 'pending' : 'auto') : 'waiting',
        assigned_to: step.approvers || [],
        comments: [],
        completed_at: null,
      }));

      const result = await db.query(
        `INSERT INTO workflow_instances (workflow_id, company_id, reference_type, reference_id, status, current_step, steps_data, initiated_by)
         VALUES ($1, $2, $3, $4, 'in_progress', 0, $5, $6) RETURNING *`,
        [
          workflowId,
          definition.company_id,
          referenceType,
          referenceId,
          JSON.stringify(stepsData),
          initiatedBy,
        ]
      );

      const instance = result.rows[0];
      if (firstStep.approvers && firstStep.approvers.length > 0) {
        return { success: true, data: instance };
      }

      return await WorkflowEngine.processStep(instance.id);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async processStep(instanceId) {
    try {
      const instanceResult = await db.query(
        `SELECT wi.*, wd.steps AS workflow_steps
         FROM workflow_instances wi
         JOIN workflow_definitions wd ON wi.workflow_id = wd.id
         WHERE wi.id = $1`,
        [instanceId]
      );
      if (instanceResult.rows.length === 0) return { success: false, error: 'Instance not found' };

      const instance = instanceResult.rows[0];
      const steps = typeof instance.workflow_steps === 'string' ? JSON.parse(instance.workflow_steps) : instance.workflow_steps;
      const stepsData = typeof instance.steps_data === 'string' ? JSON.parse(instance.steps_data) : instance.steps_data;
      const currentStepIndex = instance.current_step;
      const currentStep = steps[currentStepIndex];
      const currentStepData = stepsData[currentStepIndex];

      if (!currentStep) {
        return await WorkflowEngine._completeInstance(instance.id, stepsData);
      }

      const hasApprovers = currentStep.approvers && currentStep.approvers.length > 0;

      if (!hasApprovers) {
        currentStepData.status = 'completed';
        currentStepData.completed_at = new Date();

        const nextIndex = currentStepIndex + 1;
        if (nextIndex >= steps.length) {
          return await WorkflowEngine._completeInstance(instance.id, stepsData);
        }

        stepsData[nextIndex].status = 'pending';

        const result = await db.query(
          `UPDATE workflow_instances
           SET current_step = $1, steps_data = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $3 RETURNING *`,
          [nextIndex, JSON.stringify(stepsData), instance.id]
        );

        return await WorkflowEngine.processStep(instance.id);
      }

      currentStepData.status = 'pending';
      const result = await db.query(
        `UPDATE workflow_instances
         SET steps_data = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 RETURNING *`,
        [JSON.stringify(stepsData), instance.id]
      );

      return { success: true, data: result.rows[0], message: 'Awaiting approval' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async approveStep(instanceId, stepIndex, userId, comments) {
    try {
      const instanceResult = await db.query(
        `SELECT * FROM workflow_instances WHERE id = $1`,
        [instanceId]
      );
      if (instanceResult.rows.length === 0) return { success: false, error: 'Instance not found' };

      const instance = instanceResult.rows[0];
      const stepsData = typeof instance.steps_data === 'string' ? JSON.parse(instance.steps_data) : instance.steps_data;
      const stepData = stepsData[stepIndex];

      if (!stepData) return { success: false, error: 'Step not found' };
      if (stepData.status !== 'pending') return { success: false, error: 'Step is not pending approval' };

      stepData.status = 'approved';
      stepData.completed_at = new Date();
      stepData.comments.push({ userId, action: 'approved', comments, timestamp: new Date() });

      const nextIndex = stepIndex + 1;
      const workflowResult = await db.query(
        `SELECT steps FROM workflow_definitions wd
         JOIN workflow_instances wi ON wi.workflow_id = wd.id
         WHERE wi.id = $1`,
        [instanceId]
      );
      const steps = typeof workflowResult.rows[0].steps === 'string' ? JSON.parse(workflowResult.rows[0].steps) : workflowResult.rows[0].steps;

      if (nextIndex >= steps.length) {
        return await WorkflowEngine._completeInstance(instance.id, stepsData);
      }

      stepsData[nextIndex].status = 'pending';

      const result = await db.query(
        `UPDATE workflow_instances
         SET current_step = $1, steps_data = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 RETURNING *`,
        [nextIndex, JSON.stringify(stepsData), instance.id]
      );

      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async rejectStep(instanceId, stepIndex, userId, comments) {
    try {
      const instanceResult = await db.query(
        `SELECT * FROM workflow_instances WHERE id = $1`,
        [instanceId]
      );
      if (instanceResult.rows.length === 0) return { success: false, error: 'Instance not found' };

      const instance = instanceResult.rows[0];
      const stepsData = typeof instance.steps_data === 'string' ? JSON.parse(instance.steps_data) : instance.steps_data;
      const stepData = stepsData[stepIndex];

      if (!stepData) return { success: false, error: 'Step not found' };
      if (stepData.status !== 'pending') return { success: false, error: 'Step is not pending approval' };

      stepData.status = 'rejected';
      stepData.completed_at = new Date();
      stepData.comments.push({ userId, action: 'rejected', comments, timestamp: new Date() });

      const result = await db.query(
        `UPDATE workflow_instances
         SET status = 'rejected', steps_data = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 RETURNING *`,
        [JSON.stringify(stepsData), instance.id]
      );

      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async _completeInstance(instanceId, stepsData) {
    try {
      const result = await db.query(
        `UPDATE workflow_instances
         SET status = 'completed', steps_data = $1, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 RETURNING *`,
        [JSON.stringify(stepsData), instanceId]
      );
      return { success: true, data: result.rows[0], message: 'Workflow completed' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getWorkflowInstances(companyId, filters = {}) {
    try {
      let sql = `SELECT wi.*, wd.name AS workflow_name, wd.category AS workflow_category
                 FROM workflow_instances wi
                 JOIN workflow_definitions wd ON wi.workflow_id = wd.id
                 WHERE wd.company_id = $1`;
      const params = [companyId];
      let paramIndex = 2;

      if (filters.status) {
        sql += ` AND wi.status = $${paramIndex++}`;
        params.push(filters.status);
      }
      if (filters.reference_type) {
        sql += ` AND wi.reference_type = $${paramIndex++}`;
        params.push(filters.reference_type);
      }
      if (filters.reference_id) {
        sql += ` AND wi.reference_id = $${paramIndex++}`;
        params.push(filters.reference_id);
      }
      if (filters.workflow_id) {
        sql += ` AND wi.workflow_id = $${paramIndex++}`;
        params.push(filters.workflow_id);
      }

      sql += ` ORDER BY wi.created_at DESC`;

      if (filters.limit) {
        sql += ` LIMIT $${paramIndex++}`;
        params.push(filters.limit);
      } else {
        sql += ` LIMIT 50`;
      }
      if (filters.offset) {
        sql += ` OFFSET $${paramIndex++}`;
        params.push(filters.offset);
      }

      const result = await db.query(sql, params);
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getInstanceById(instanceId) {
    try {
      const result = await db.query(
        `SELECT wi.*, wd.name AS workflow_name, wd.steps AS workflow_steps
         FROM workflow_instances wi
         JOIN workflow_definitions wd ON wi.workflow_id = wd.id
         WHERE wi.id = $1`,
        [instanceId]
      );
      if (result.rows.length === 0) return { success: false, error: 'Instance not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getWorkflowStats(companyId) {
    try {
      const byStatus = await db.query(
        `SELECT wi.status, COUNT(*)::int AS count
         FROM workflow_instances wi
         JOIN workflow_definitions wd ON wi.workflow_id = wd.id
         WHERE wd.company_id = $1
         GROUP BY wi.status ORDER BY wi.status`,
        [companyId]
      );

      const byCategory = await db.query(
        `SELECT wd.category, COUNT(*)::int AS count
         FROM workflow_instances wi
         JOIN workflow_definitions wd ON wi.workflow_id = wd.id
         WHERE wd.company_id = $1
         GROUP BY wd.category ORDER BY wd.category`,
        [companyId]
      );

      const pendingCount = await db.query(
        `SELECT COUNT(*)::int AS pending_count
         FROM workflow_instances wi
         JOIN workflow_definitions wd ON wi.workflow_id = wd.id
         WHERE wd.company_id = $1 AND wi.status = 'in_progress'`,
        [companyId]
      );

      const completedCount = await db.query(
        `SELECT COUNT(*)::int AS completed_count
         FROM workflow_instances wi
         JOIN workflow_definitions wd ON wi.workflow_id = wd.id
         WHERE wd.company_id = $1 AND wi.status = 'completed'`,
        [companyId]
      );

      return {
        success: true,
        data: {
          by_status: byStatus.rows,
          by_category: byCategory.rows,
          pending_count: pendingCount.rows[0].pending_count,
          completed_count: completedCount.rows[0].completed_count,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = WorkflowEngine;
