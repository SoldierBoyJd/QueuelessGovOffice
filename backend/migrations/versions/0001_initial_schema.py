"""initial schema

Revision ID: 0001
Revises: 
Create Date: 2026-10-09 20:02:40.824059
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('offices',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('name', sa.Text(), nullable=False),
    sa.Column('code', sa.String(length=64), nullable=False),
    sa.Column('address', sa.Text(), nullable=False),
    sa.Column('city', sa.Text(), nullable=True),
    sa.Column('district', sa.Text(), nullable=True),
    sa.Column('state', sa.Text(), nullable=True),
    sa.Column('phone', sa.Text(), nullable=True),
    sa.Column('lat', sa.Float(), nullable=True),
    sa.Column('lng', sa.Float(), nullable=True),
    sa.Column('timezone', sa.Text(), nullable=False),
    sa.Column('opening_time', sa.Time(), nullable=True),
    sa.Column('closing_time', sa.Time(), nullable=True),
    sa.Column('call_grace_minutes', sa.Integer(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_offices')),
    sa.UniqueConstraint('code', name=op.f('uq_offices_code'))
    )
    op.create_table('services',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('office_id', sa.Uuid(), nullable=False),
    sa.Column('name', sa.Text(), nullable=False),
    sa.Column('code', sa.String(length=16), nullable=False),
    sa.Column('department', sa.Text(), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('icon_name', sa.String(length=64), nullable=True),
    sa.Column('estimated_service_minutes', sa.Integer(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('estimated_service_minutes > 0', name=op.f('ck_services_service_minutes_positive')),
    sa.ForeignKeyConstraint(['office_id'], ['offices.id'], name=op.f('fk_services_office_id_offices'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_services')),
    sa.UniqueConstraint('id', 'office_id', name='uq_services_id_office'),
    sa.UniqueConstraint('office_id', 'code', name='uq_services_office_code')
    )
    op.create_index('ix_services_office_active', 'services', ['office_id', 'is_active'], unique=False)
    op.create_table('counters',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('office_id', sa.Uuid(), nullable=False),
    sa.Column('service_id', sa.Uuid(), nullable=True),
    sa.Column('name', sa.String(length=64), nullable=False),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('status_reason', sa.Text(), nullable=True),
    sa.Column('status_changed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("status IN ('ACTIVE','PAUSED','CLOSED')", name=op.f('ck_counters_status_valid')),
    sa.ForeignKeyConstraint(['office_id'], ['offices.id'], name=op.f('fk_counters_office_id_offices'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['service_id', 'office_id'], ['services.id', 'services.office_id'], name='fk_counters_service_office', ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_counters')),
    sa.UniqueConstraint('id', 'office_id', name='uq_counters_id_office'),
    sa.UniqueConstraint('office_id', 'name', name='uq_counters_office_name')
    )
    op.create_index('ix_counters_office_status', 'counters', ['office_id', 'status'], unique=False)
    op.create_table('queue_counters',
    sa.Column('office_id', sa.Uuid(), nullable=False),
    sa.Column('service_id', sa.Uuid(), nullable=False),
    sa.Column('queue_date', sa.Date(), nullable=False),
    sa.Column('last_number', sa.Integer(), server_default='0', nullable=False),
    sa.CheckConstraint('last_number >= 0', name=op.f('ck_queue_counters_last_number_nonneg')),
    sa.ForeignKeyConstraint(['office_id'], ['offices.id'], name=op.f('fk_queue_counters_office_id_offices'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['service_id', 'office_id'], ['services.id', 'services.office_id'], name='fk_queue_counters_service_office', ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('office_id', 'service_id', 'queue_date', name=op.f('pk_queue_counters'))
    )
    op.create_table('users',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('full_name', sa.Text(), nullable=False),
    sa.Column('email', sa.String(length=320), nullable=False),
    sa.Column('phone', sa.Text(), nullable=True),
    sa.Column('password_hash', sa.Text(), nullable=True),
    sa.Column('role', sa.String(length=32), nullable=False),
    sa.Column('office_id', sa.Uuid(), nullable=True),
    sa.Column('counter_id', sa.Uuid(), nullable=True),
    sa.Column('verification_status', sa.String(length=32), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('token_valid_after', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("role IN ('CITIZEN','OFFICER','OFFICE_ADMIN','CENTRAL_ADMIN','SUPER_ADMIN')", name=op.f('ck_users_role_valid')),
    sa.CheckConstraint("role NOT IN ('OFFICER','OFFICE_ADMIN') OR office_id IS NOT NULL", name=op.f('ck_users_staff_must_have_office')),
    sa.CheckConstraint("verification_status IN ('NOT_REQUIRED','PENDING','UNDER_REVIEW','APPROVED','REJECTED','MORE_INFO_REQUIRED')", name=op.f('ck_users_verification_status_valid')),
    sa.CheckConstraint('counter_id IS NULL OR office_id IS NOT NULL', name=op.f('ck_users_counter_requires_office')),
    sa.ForeignKeyConstraint(['counter_id', 'office_id'], ['counters.id', 'counters.office_id'], name='fk_users_counter_office', ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['office_id'], ['offices.id'], name=op.f('fk_users_office_id_offices'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_users')),
    sa.UniqueConstraint('email', name=op.f('uq_users_email'))
    )
    op.create_index('ix_users_office_role', 'users', ['office_id', 'role'], unique=False)
    op.create_table('audit_logs',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('actor_user_id', sa.Uuid(), nullable=True),
    sa.Column('source', sa.String(length=16), nullable=False),
    sa.Column('action', sa.String(length=64), nullable=False),
    sa.Column('entity_type', sa.String(length=32), nullable=False),
    sa.Column('entity_id', sa.String(length=64), nullable=True),
    sa.Column('office_id', sa.Uuid(), nullable=True),
    sa.Column('detail', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('clock_timestamp()'), nullable=False),
    sa.CheckConstraint("source IN ('HUMAN','SYSTEM')", name=op.f('ck_audit_logs_source_valid')),
    sa.ForeignKeyConstraint(['actor_user_id'], ['users.id'], name=op.f('fk_audit_logs_actor_user_id_users'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['office_id'], ['offices.id'], name=op.f('fk_audit_logs_office_id_offices'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_audit_logs'))
    )
    op.create_index('ix_audit_logs_created', 'audit_logs', [sa.literal_column('created_at DESC')], unique=False)
    op.create_index('ix_audit_logs_entity', 'audit_logs', ['entity_type', 'entity_id'], unique=False)
    op.create_table('staff_applications',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('applicant_id', sa.Uuid(), nullable=False),
    sa.Column('requested_role', sa.String(length=32), nullable=False),
    sa.Column('requested_office_id', sa.Uuid(), nullable=False),
    sa.Column('status', sa.String(length=32), nullable=False),
    sa.Column('documents', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=False),
    sa.Column('findings', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=False),
    sa.Column('reviewer_note', sa.Text(), nullable=True),
    sa.Column('reviewed_by', sa.Uuid(), nullable=True),
    sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('submitted_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("requested_role IN ('OFFICER','OFFICE_ADMIN')", name=op.f('ck_staff_applications_requested_role_valid')),
    sa.CheckConstraint("status IN ('PENDING','UNDER_REVIEW','APPROVED','REJECTED','MORE_INFO_REQUIRED')", name=op.f('ck_staff_applications_status_valid')),
    sa.ForeignKeyConstraint(['applicant_id'], ['users.id'], name=op.f('fk_staff_applications_applicant_id_users'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['requested_office_id'], ['offices.id'], name=op.f('fk_staff_applications_requested_office_id_offices'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], name=op.f('fk_staff_applications_reviewed_by_users'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_staff_applications'))
    )
    op.create_index('ix_staff_applications_office_status', 'staff_applications', ['requested_office_id', 'status'], unique=False)
    op.create_index('uq_staff_applications_one_open', 'staff_applications', ['applicant_id'], unique=True, postgresql_where=sa.text("status IN ('PENDING','UNDER_REVIEW','MORE_INFO_REQUIRED')"))
    op.create_table('tokens',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('display_number', sa.String(length=32), nullable=False),
    sa.Column('citizen_id', sa.Uuid(), nullable=True),
    sa.Column('office_id', sa.Uuid(), nullable=False),
    sa.Column('service_id', sa.Uuid(), nullable=False),
    sa.Column('counter_id', sa.Uuid(), nullable=True),
    sa.Column('queue_date', sa.Date(), nullable=False),
    sa.Column('queue_number', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('idempotency_key', sa.String(length=128), nullable=True),
    sa.Column('preferred_language', sa.String(length=16), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('clock_timestamp()'), nullable=False),
    sa.Column('called_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('service_started_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("status IN ('WAITING','CALLED','SERVING','ON_HOLD','COMPLETED','NO_SHOW','CANCELLED')", name=op.f('ck_tokens_status_valid')),
    sa.CheckConstraint('completed_at IS NULL OR service_started_at IS NULL OR completed_at >= service_started_at', name=op.f('ck_tokens_duration_nonneg')),
    sa.CheckConstraint('queue_number > 0', name=op.f('ck_tokens_queue_number_positive')),
    sa.ForeignKeyConstraint(['citizen_id'], ['users.id'], name=op.f('fk_tokens_citizen_id_users'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['counter_id', 'office_id'], ['counters.id', 'counters.office_id'], name='fk_tokens_counter_office', ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['office_id'], ['offices.id'], name=op.f('fk_tokens_office_id_offices'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['service_id', 'office_id'], ['services.id', 'services.office_id'], name='fk_tokens_service_office', ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_tokens')),
    sa.UniqueConstraint('office_id', 'queue_date', 'display_number', name='uq_token_display_number'),
    sa.UniqueConstraint('office_id', 'service_id', 'queue_date', 'queue_number', name='uq_token_queue_number')
    )
    op.create_index('ix_tokens_citizen_created', 'tokens', ['citizen_id', sa.literal_column('created_at DESC')], unique=False)
    op.create_index('ix_tokens_office_status', 'tokens', ['office_id', 'status', 'created_at'], unique=False)
    op.create_index('ix_tokens_queue_order', 'tokens', ['office_id', 'queue_date', 'created_at', 'id'], unique=False, postgresql_where=sa.text("status = 'WAITING'"))
    op.create_index('uq_tokens_idempotency', 'tokens', ['citizen_id', 'idempotency_key'], unique=True, postgresql_where=sa.text('idempotency_key IS NOT NULL'))
    op.create_index('uq_tokens_one_active_per_counter', 'tokens', ['counter_id'], unique=True, postgresql_where=sa.text("counter_id IS NOT NULL AND status IN ('CALLED','SERVING','ON_HOLD')"))
    op.create_index('uq_tokens_one_live_per_citizen_service', 'tokens', ['citizen_id', 'service_id'], unique=True, postgresql_where=sa.text("citizen_id IS NOT NULL AND status IN ('WAITING','CALLED','SERVING','ON_HOLD')"))
    op.create_table('notifications',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('token_id', sa.Uuid(), nullable=True),
    sa.Column('type', sa.String(length=32), nullable=False),
    sa.Column('severity', sa.String(length=16), nullable=False),
    sa.Column('title', sa.Text(), nullable=False),
    sa.Column('message', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('clock_timestamp()'), nullable=False),
    sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('delivery_status', sa.String(length=16), nullable=False),
    sa.CheckConstraint("delivery_status IN ('IN_APP','PENDING','SENT','FAILED')", name=op.f('ck_notifications_delivery_status_valid')),
    sa.CheckConstraint("severity IN ('INFO','SUCCESS','WARNING','ERROR')", name=op.f('ck_notifications_severity_valid')),
    sa.CheckConstraint("type IN ('TOKEN_CREATED','TURN_APPROACHING','TOKEN_CALLED','SERVICE_STARTED','TOKEN_COMPLETED','TOKEN_NO_SHOW','TOKEN_CANCELLED','TOKEN_REQUEUED','SERVICE_UPDATE','VERIFICATION_UPDATE')", name=op.f('ck_notifications_type_valid')),
    sa.ForeignKeyConstraint(['token_id'], ['tokens.id'], name=op.f('fk_notifications_token_id_tokens'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_notifications_user_id_users'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_notifications'))
    )
    op.create_index('ix_notifications_user_created', 'notifications', ['user_id', sa.literal_column('created_at DESC')], unique=False)
    op.create_index('ix_notifications_user_unread', 'notifications', ['user_id', sa.literal_column('created_at DESC')], unique=False, postgresql_where=sa.text('read_at IS NULL'))
    op.create_index('uq_notifications_turn_approaching', 'notifications', ['token_id'], unique=True, postgresql_where=sa.text("type = 'TURN_APPROACHING'"))
    op.create_table('prediction_snapshots',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('office_id', sa.Uuid(), nullable=False),
    sa.Column('service_id', sa.Uuid(), nullable=False),
    sa.Column('token_id', sa.Uuid(), nullable=True),
    sa.Column('predicted_wait_minutes', sa.Numeric(precision=8, scale=2), nullable=False),
    sa.Column('lower_minutes', sa.Numeric(precision=8, scale=2), nullable=True),
    sa.Column('upper_minutes', sa.Numeric(precision=8, scale=2), nullable=True),
    sa.Column('queue_position', sa.Integer(), nullable=True),
    sa.Column('method', sa.String(length=16), nullable=False),
    sa.Column('model_version', sa.String(length=64), nullable=True),
    sa.Column('generated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("method <> 'ML' OR model_version IS NOT NULL", name=op.f('ck_prediction_snapshots_ml_requires_version')),
    sa.CheckConstraint("method IN ('BASELINE','ML')", name=op.f('ck_prediction_snapshots_method_valid')),
    sa.CheckConstraint('predicted_wait_minutes >= 0', name=op.f('ck_prediction_snapshots_wait_nonneg')),
    sa.ForeignKeyConstraint(['office_id'], ['offices.id'], name=op.f('fk_prediction_snapshots_office_id_offices'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['service_id', 'office_id'], ['services.id', 'services.office_id'], name='fk_prediction_snapshots_service_office', ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['token_id'], ['tokens.id'], name=op.f('fk_prediction_snapshots_token_id_tokens'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_prediction_snapshots'))
    )
    op.create_index('ix_prediction_token_time', 'prediction_snapshots', ['token_id', sa.literal_column('generated_at DESC')], unique=False)
    op.create_table('queue_events',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('token_id', sa.Uuid(), nullable=False),
    sa.Column('office_id', sa.Uuid(), nullable=False),
    sa.Column('actor_user_id', sa.Uuid(), nullable=True),
    sa.Column('counter_id', sa.Uuid(), nullable=True),
    sa.Column('event_type', sa.String(length=32), nullable=False),
    sa.Column('from_status', sa.String(length=16), nullable=True),
    sa.Column('to_status', sa.String(length=16), nullable=True),
    sa.Column('reason', sa.Text(), nullable=True),
    sa.Column('metadata', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=False),
    sa.Column('occurred_at', sa.DateTime(timezone=True), server_default=sa.text('clock_timestamp()'), nullable=False),
    sa.CheckConstraint("event_type IN ('TOKEN_CREATED','TOKEN_CALLED','SERVICE_STARTED','SERVICE_COMPLETED','TOKEN_HELD','TOKEN_RESUMED','TOKEN_NO_SHOW','TOKEN_CANCELLED','TOKEN_REQUEUED','TOKEN_EXPIRED')", name=op.f('ck_queue_events_event_type_valid')),
    sa.ForeignKeyConstraint(['actor_user_id'], ['users.id'], name=op.f('fk_queue_events_actor_user_id_users'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['counter_id'], ['counters.id'], name=op.f('fk_queue_events_counter_id_counters'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['office_id'], ['offices.id'], name=op.f('fk_queue_events_office_id_offices'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['token_id'], ['tokens.id'], name=op.f('fk_queue_events_token_id_tokens'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_queue_events'))
    )
    op.create_index('ix_queue_events_office_time', 'queue_events', ['office_id', 'occurred_at'], unique=False)
    op.create_index('ix_queue_events_token_time', 'queue_events', ['token_id', 'occurred_at'], unique=False)

    # Queue history is append-only: block UPDATE/DELETE at the database level.
    op.execute("""
        CREATE FUNCTION queue_events_immutable() RETURNS trigger AS $$
        BEGIN
            RAISE EXCEPTION 'queue_events is append-only';
        END;
        $$ LANGUAGE plpgsql
    """)
    op.execute("""
        CREATE TRIGGER trg_queue_events_immutable
        BEFORE UPDATE OR DELETE ON queue_events
        FOR EACH ROW EXECUTE FUNCTION queue_events_immutable()
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_queue_events_immutable ON queue_events")
    op.execute("DROP FUNCTION IF EXISTS queue_events_immutable()")
    op.drop_index('ix_queue_events_token_time', table_name='queue_events')
    op.drop_index('ix_queue_events_office_time', table_name='queue_events')
    op.drop_table('queue_events')
    op.drop_index('ix_prediction_token_time', table_name='prediction_snapshots')
    op.drop_table('prediction_snapshots')
    op.drop_index('uq_notifications_turn_approaching', table_name='notifications', postgresql_where=sa.text("type = 'TURN_APPROACHING'"))
    op.drop_index('ix_notifications_user_unread', table_name='notifications', postgresql_where=sa.text('read_at IS NULL'))
    op.drop_index('ix_notifications_user_created', table_name='notifications')
    op.drop_table('notifications')
    op.drop_index('uq_tokens_one_live_per_citizen_service', table_name='tokens', postgresql_where=sa.text("citizen_id IS NOT NULL AND status IN ('WAITING','CALLED','SERVING','ON_HOLD')"))
    op.drop_index('uq_tokens_one_active_per_counter', table_name='tokens', postgresql_where=sa.text("counter_id IS NOT NULL AND status IN ('CALLED','SERVING','ON_HOLD')"))
    op.drop_index('uq_tokens_idempotency', table_name='tokens', postgresql_where=sa.text('idempotency_key IS NOT NULL'))
    op.drop_index('ix_tokens_queue_order', table_name='tokens', postgresql_where=sa.text("status = 'WAITING'"))
    op.drop_index('ix_tokens_office_status', table_name='tokens')
    op.drop_index('ix_tokens_citizen_created', table_name='tokens')
    op.drop_table('tokens')
    op.drop_index('uq_staff_applications_one_open', table_name='staff_applications', postgresql_where=sa.text("status IN ('PENDING','UNDER_REVIEW','MORE_INFO_REQUIRED')"))
    op.drop_index('ix_staff_applications_office_status', table_name='staff_applications')
    op.drop_table('staff_applications')
    op.drop_index('ix_audit_logs_entity', table_name='audit_logs')
    op.drop_index('ix_audit_logs_created', table_name='audit_logs')
    op.drop_table('audit_logs')
    op.drop_index('ix_users_office_role', table_name='users')
    op.drop_table('users')
    op.drop_table('queue_counters')
    op.drop_index('ix_counters_office_status', table_name='counters')
    op.drop_table('counters')
    op.drop_index('ix_services_office_active', table_name='services')
    op.drop_table('services')
    op.drop_table('offices')
