import React, { useState, useCallback } from 'react';
import {
  Button,
  Collapsible,
  Input,
  InputNumber,
  Tag,
  Typography,
  Popconfirm,
} from '@douyinfe/semi-ui';
import {
  IconPlus,
  IconDelete,
  IconChevronDown,
  IconChevronUp,
} from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

let _idCounter = 0;
const uid = () => `mgr_${++_idCounter}`;

function parseJSON(str) {
  if (!str || !str.trim()) return {};
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}

function flattenRules(nested) {
  const rules = [];
  for (const [group, inner] of Object.entries(nested)) {
    if (typeof inner !== 'object' || inner === null) continue;
    for (const [model, ratio] of Object.entries(inner)) {
      rules.push({
        _id: uid(),
        group,
        model,
        ratio: typeof ratio === 'number' ? ratio : 1,
      });
    }
  }
  return rules;
}

function nestRules(rules) {
  const result = {};
  rules.forEach(({ group, model, ratio }) => {
    if (!group || !model) return;
    if (!result[group]) result[group] = {};
    result[group][model] = ratio;
  });
  return result;
}

export function serializeModelGroupRatio(rules) {
  const nested = nestRules(rules);
  return Object.keys(nested).length === 0
    ? ''
    : JSON.stringify(nested, null, 2);
}

function ModelGroupSection({ groupName, items, onUpdate, onRemove, onAdd, t }) {
  const [open, setOpen] = useState(false);

  const handleModelChange = useCallback(
    (itemId, newModel) => {
      const next = items.map((item) =>
        item._id === itemId ? { ...item, model: newModel } : item,
      );
      onUpdate(next);
    },
    [items, onUpdate],
  );

  const handleRatioChange = useCallback(
    (itemId, newRatio) => {
      const next = items.map((item) =>
        item._id === itemId ? { ...item, ratio: newRatio } : item,
      );
      onUpdate(next);
    },
    [items, onUpdate],
  );

  return (
    <div
      style={{
        border: '1px solid var(--semi-color-border)',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 8,
      }}
    >
      <div
        className='flex items-center justify-between cursor-pointer'
        style={{ padding: '8px 12px', background: 'var(--semi-color-fill-0)' }}
        onClick={() => setOpen(!open)}
      >
        <div className='flex items-center gap-2'>
          {open ? <IconChevronUp size='small' /> : <IconChevronDown size='small' />}
          <Text strong>{groupName}</Text>
          <Tag size='small' color='green'>
            {items.length} {t('条模型倍率')}
          </Tag>
        </div>
        <div className='flex items-center gap-1' onClick={(e) => e.stopPropagation()}>
          <Button
            icon={<IconPlus />}
            size='small'
            theme='borderless'
            onClick={() => onAdd(groupName)}
          />
          <Popconfirm
            title={t('确认删除该分组的所有模型倍率规则？')}
            onConfirm={() => items.forEach((item) => onRemove(item._id))}
          >
            <Button icon={<IconDelete />} size='small' theme='borderless' type='danger' />
          </Popconfirm>
        </div>
      </div>
      {open && (
        <div style={{ padding: 12 }}>
          {items.length === 0 ? (
            <Text type='tertiary'>{t('暂无模型倍率配置')}</Text>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '4px 8px', width: '45%' }}>
                    <Text size='small' type='tertiary'>{t('模型名称')}</Text>
                  </th>
                  <th style={{ textAlign: 'left', padding: '4px 8px', width: '40%' }}>
                    <Text size='small' type='tertiary'>{t('倍率')}</Text>
                  </th>
                  <th style={{ textAlign: 'center', padding: '4px 8px', width: '15%' }}>
                    <Text size='small' type='tertiary'>{t('操作')}</Text>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id} style={{ borderTop: '1px solid var(--semi-color-border)' }}>
                    <td style={{ padding: '4px 8px' }}>
                      <Input
                        size='small'
                        placeholder='gpt-4'
                        value={item.model}
                        onChange={(v) => handleModelChange(item._id, v)}
                      />
                    </td>
                    <td style={{ padding: '4px 8px' }}>
                      <InputNumber
                        size='small'
                        min={0}
                        step={0.01}
                        placeholder='0.8'
                        value={item.ratio}
                        onChange={(v) => handleRatioChange(item._id, v)}
                        style={{ width: '100%' }}
                      />
                    </td>
                    <td style={{ textAlign: 'center', padding: '4px 8px' }}>
                      <Button
                        icon={<IconDelete />}
                        size='small'
                        theme='borderless'
                        type='danger'
                        onClick={() => onRemove(item._id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Button
            icon={<IconPlus />}
            size='small'
            style={{ marginTop: 8 }}
            onClick={() => onAdd(groupName)}
          >
            {t('添加模型倍率')}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ModelGroupRatioRules(props) {
  const { t } = useTranslation();
  const rawValue = props.value || '';
  const groupNames = props.groupNames || [];
  const onChange = props.onChange;

  const [rules, setRules] = useState(() => flattenRules(parseJSON(rawValue)));

  const syncToParent = useCallback(
    (next) => {
      setRules(next);
      onChange && onChange(serializeModelGroupRatio(next));
    },
    [onChange],
  );

  // Group rules by group name
  const groupsMap = {};
  rules.forEach((rule) => {
    if (!groupsMap[rule.group]) groupsMap[rule.group] = [];
    groupsMap[rule.group].push(rule);
  });

  const addItem = useCallback(
    (groupName) => {
      const next = [...rules, { _id: uid(), group: groupName, model: '', ratio: 1 }];
      syncToParent(next);
    },
    [rules, syncToParent],
  );

  const removeItem = useCallback(
    (itemId) => {
      const next = rules.filter((item) => item._id !== itemId);
      syncToParent(next);
    },
    [rules, syncToParent],
  );

  const updateGroupItems = useCallback(
    (groupName, updatedItems) => {
      const other = rules.filter((r) => r.group !== groupName);
      syncToParent([...other, ...updatedItems]);
    },
    [rules, syncToParent],
  );

  // All group names (including ones from rules that may not be in the group list)
  const allGroupNames = [...new Set([...groupNames, ...Object.keys(groupsMap)])].sort();

  if (allGroupNames.length === 0) {
    return <Text type='tertiary'>{t('暂无分组，请先在分组管理中创建分组')}</Text>;
  }

  return (
    <div>
      {allGroupNames.map((groupName) => (
        <ModelGroupSection
          key={groupName}
          groupName={groupName}
          items={groupsMap[groupName] || []}
          onUpdate={(updatedItems) => updateGroupItems(groupName, updatedItems)}
          onRemove={removeItem}
          onAdd={(gn) => addItem(gn)}
          t={t}
        />
      ))}
    </div>
  );
}
